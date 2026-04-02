use std::collections::HashMap;

use reqwest::Client;

use crate::contract::{OutboundPayload, PreparedImagePayload};
use crate::credentials::TransferCredentials;
use crate::push_provider::{PushOptions, PushResult};

pub struct WebhookChannel {
    client: Client,
    creds: TransferCredentials,
    opts: PushOptions,
}

impl WebhookChannel {
    pub fn new(client: Client, creds: TransferCredentials, opts: PushOptions) -> Self {
        Self { client, creds, opts }
    }

    pub async fn send(&self, payload: &OutboundPayload) -> PushResult {
        let webhook_url = self.creds.webhook_url.trim();
        if webhook_url.is_empty() {
            return PushResult {
                success: false,
                message: "Webhook URL 未配置".to_string(),
            };
        }

        let payload_str = match render_webhook_payload(&self.opts, payload) {
            Ok(payload) => payload,
            Err(message) => {
                return PushResult {
                    success: false,
                    message,
                };
            }
        };

        let mut req = self
            .client
            .post(webhook_url)
            .header("Content-Type", "application/json")
            .body(payload_str);

        if !self.creds.webhook_headers.trim().is_empty() {
            let headers =
                match serde_json::from_str::<HashMap<String, String>>(&self.creds.webhook_headers) {
                    Ok(headers) => headers,
                    Err(e) => {
                        return PushResult {
                            success: false,
                            message: format!("Webhook Headers JSON 无效: {e}"),
                        };
                    }
                };

            for (key, value) in headers {
                req = req.header(&key, &value);
            }
        }

        match req.send().await {
            Ok(resp) => {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                if status.is_success() {
                    PushResult {
                        success: true,
                        message: "推送成功".to_string(),
                    }
                } else {
                    PushResult {
                        success: false,
                        message: format!("Webhook 返回 {status}: {text}"),
                    }
                }
            }
            Err(e) => PushResult {
                success: false,
                message: format!("网络错误: {e}"),
            },
        }
    }
}

struct RenderReplacement {
    quoted_placeholder: String,
    bare_placeholder: String,
    quoted_value: String,
    bare_value: String,
}

impl RenderReplacement {
    fn string(token: &str, value: &str, bare_as_json_literal: bool) -> Self {
        let quoted_value = json_string_literal(value);
        let bare_value = if bare_as_json_literal {
            quoted_value.clone()
        } else {
            escaped_json_string_fragment(value)
        };

        Self {
            quoted_placeholder: format!("\"{{{{{token}}}}}\""),
            bare_placeholder: format!("{{{{{token}}}}}"),
            quoted_value,
            bare_value,
        }
    }

    fn number(token: &str, value: usize) -> Self {
        let rendered = value.to_string();

        Self {
            quoted_placeholder: format!("\"{{{{{token}}}}}\""),
            bare_placeholder: format!("{{{{{token}}}}}"),
            quoted_value: rendered.clone(),
            bare_value: rendered,
        }
    }
}

fn json_string_literal(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_string())
}

fn escaped_json_string_fragment(value: &str) -> String {
    let literal = json_string_literal(value);
    literal
        .strip_prefix('"')
        .and_then(|text| text.strip_suffix('"'))
        .unwrap_or(&literal)
        .to_string()
}

fn render_template_once(template: &str, replacements: &[RenderReplacement]) -> String {
    let mut rendered = String::with_capacity(template.len());
    let mut index = 0;

    while index < template.len() {
        let remaining = &template[index..];

        if let Some(replacement) = replacements
            .iter()
            .find(|replacement| remaining.starts_with(&replacement.quoted_placeholder))
        {
            rendered.push_str(&replacement.quoted_value);
            index += replacement.quoted_placeholder.len();
            continue;
        }

        if let Some(replacement) = replacements
            .iter()
            .find(|replacement| remaining.starts_with(&replacement.bare_placeholder))
        {
            rendered.push_str(&replacement.bare_value);
            index += replacement.bare_placeholder.len();
            continue;
        }

        let mut chars = remaining.chars();
        let ch = chars.next().unwrap_or_default();
        rendered.push(ch);
        index += ch.len_utf8();
    }

    rendered
}

fn render_webhook_payload(opts: &PushOptions, payload: &OutboundPayload) -> Result<String, String> {
    let (content, display_type, display_source, content_length) = match payload {
        OutboundPayload::Text(payload) => (
            payload.content.as_str(),
            payload.display_type.as_str(),
            payload.display_source.as_str(),
            payload.content_length,
        ),
        OutboundPayload::Image(payload) => image_template_values(payload),
    };

    let render_with_strategy = |bare_as_json_literal: bool| {
        let replacements = vec![
            RenderReplacement::string("剪贴板内容", content, bare_as_json_literal),
            RenderReplacement::string("类型标签", display_type, bare_as_json_literal),
            RenderReplacement::string("来源", display_source, bare_as_json_literal),
            RenderReplacement::number("内容长度", content_length),
        ];

        render_template_once(&opts.webhook_payload_template, &replacements)
    };

    let primary_payload = render_with_strategy(false);
    if serde_json::from_str::<serde_json::Value>(&primary_payload).is_ok() {
        return Ok(primary_payload);
    }

    let fallback_payload = render_with_strategy(true);
    serde_json::from_str::<serde_json::Value>(&fallback_payload)
        .map_err(|e| format!("Webhook Payload 模板生成的 JSON 无效: {e}"))?;

    Ok(fallback_payload)
}

fn image_template_values(payload: &PreparedImagePayload) -> (&str, &str, &str, usize) {
    (
        payload.image_url.as_str(),
        "图片",
        payload.display_source.as_str(),
        payload.image_url.chars().count(),
    )
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;
    use crate::contract::{OutboundPayload, PreparedImagePayload, ProcessedPayload};

    fn test_options(template: &str) -> PushOptions {
        PushOptions {
            bark_level: "active".to_string(),
            bark_auto_copy: true,
            bark_archive: false,
            bark_group_mode: "disabled".to_string(),
            bark_group_mapping: HashMap::new(),
            image_strategy: "lan_server".to_string(),
            image_ttl_seconds: 180,
            webhook_payload_template: template.to_string(),
        }
    }

    fn text_payload(content: &str) -> OutboundPayload {
        OutboundPayload::Text(ProcessedPayload {
            display_type: "纯文本".to_string(),
            content: content.to_string(),
            content_length: content.chars().count(),
            display_source: "EcoPaste - Chrome".to_string(),
        })
    }

    #[test]
    fn test_default_webhook_template_is_valid_json() {
        let payload = render_webhook_payload(
            &test_options(r#"{"msg_type":"text","content":{"text":"{{剪贴板内容}}"}}"#),
            &text_payload("测试内容"),
        )
        .unwrap();

        assert!(serde_json::from_str::<serde_json::Value>(&payload).is_ok());
    }

    #[test]
    fn test_render_webhook_payload_uses_chinese_variables() {
        let payload = render_webhook_payload(
            &test_options(r#"{"type":"{{类型标签}}","source":"{{来源}}"}"#),
            &text_payload("hello"),
        )
        .unwrap();

        assert_eq!(
            payload,
            r#"{"type":"纯文本","source":"EcoPaste - Chrome"}"#
        );
    }

    #[test]
    fn test_render_webhook_payload_preserves_placeholder_like_content() {
        let payload = render_webhook_payload(
            &test_options(r#"{"content":"{{剪贴板内容}}","type":"{{类型标签}}"}"#),
            &text_payload("原文里有 {{类型标签}} 和 {{来源}}，不要替换"),
        )
        .unwrap();

        let parsed = serde_json::from_str::<serde_json::Value>(&payload).unwrap();
        assert_eq!(
            parsed["content"],
            "原文里有 {{类型标签}} 和 {{来源}}，不要替换"
        );
        assert_eq!(parsed["type"], "纯文本");
    }

    #[test]
    fn test_render_webhook_payload_supports_embedded_placeholders() {
        let payload = render_webhook_payload(
            &test_options(
                r#"{"msg_type":"text","content":{"text":"来源: {{来源}}\n内容: {{剪贴板内容}}\n字数: {{内容长度}}"}}"#,
            ),
            &text_payload("Line1\nLine2"),
        )
        .unwrap();

        let parsed = serde_json::from_str::<serde_json::Value>(&payload).unwrap();
        assert_eq!(
            parsed["content"]["text"],
            "来源: EcoPaste - Chrome\n内容: Line1\nLine2\n字数: 11"
        );
    }

    #[test]
    fn test_render_webhook_payload_supports_bare_placeholders() {
        let payload = render_webhook_payload(
            &test_options(r#"{"text":{{剪贴板内容}},"length":{{内容长度}}}"#),
            &text_payload("hello"),
        )
        .unwrap();

        assert_eq!(payload, r#"{"text":"hello","length":5}"#);
    }

    #[test]
    fn test_render_webhook_payload_for_image_uses_url() {
        let payload = render_webhook_payload(
            &test_options(r#"{"content":"{{剪贴板内容}}","type":"{{类型标签}}"}"#),
            &OutboundPayload::Image(PreparedImagePayload {
                display_source: "EcoPaste - Chrome".to_string(),
                image_url: "https://example.com/a.png".to_string(),
                display_name: "a.png".to_string(),
            }),
        )
        .unwrap();

        assert_eq!(
            payload,
            r#"{"content":"https://example.com/a.png","type":"图片"}"#
        );
    }
}
