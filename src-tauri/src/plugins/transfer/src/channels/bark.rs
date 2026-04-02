use reqwest::{Client, Url};
use serde::Deserialize;
use tokio::time::{sleep, Duration};

use crate::contract::{OutboundPayload, PreparedImagePayload, ProcessedPayload};
use crate::credentials::TransferCredentials;
use crate::push_provider::{PushOptions, PushResult};

const MAX_SEGMENT_BYTES: usize = 3000;

#[derive(Debug, Clone)]
struct PushSegment {
    title: String,
    body: String,
}

#[derive(Debug, Deserialize)]
struct BarkErrorBody {
    message: Option<String>,
}

pub struct BarkChannel {
    client: Client,
    creds: TransferCredentials,
    opts: PushOptions,
    group_key: Option<String>,
}

impl BarkChannel {
    pub fn new(
        client: Client,
        creds: TransferCredentials,
        opts: PushOptions,
        group_key: Option<String>,
    ) -> Self {
        Self {
            client,
            creds,
            opts,
            group_key,
        }
    }

    pub async fn send(&self, payload: &OutboundPayload) -> PushResult {
        match payload {
            OutboundPayload::Text(payload) => self.send_text(payload).await,
            OutboundPayload::Image(payload) => self.send_image(payload).await,
        }
    }

    async fn send_text(&self, payload: &ProcessedPayload) -> PushResult {
        let (url, group) = match self.resolve_endpoint_and_group() {
            Ok(value) => value,
            Err(result) => return result,
        };

        let segments = chunk_text_payload(payload);

        for (index, segment) in segments.iter().enumerate() {
            let result = self.push_text_segment(&url, segment, group.as_deref()).await;
            if !result.success {
                return result;
            }

            if index + 1 < segments.len() {
                sleep(Duration::from_millis(500)).await;
            }
        }

        PushResult {
            success: true,
            message: "推送成功".to_string(),
        }
    }

    async fn send_image(&self, payload: &PreparedImagePayload) -> PushResult {
        let (url, group) = match self.resolve_endpoint_and_group() {
            Ok(value) => value,
            Err(result) => return result,
        };

        let image_url = match build_bark_image_url(
            &url,
            &payload.display_source,
            &payload.image_url,
            &self.opts,
            group.as_deref(),
        ) {
            Ok(url) => url,
            Err(message) => {
                return PushResult {
                    success: false,
                    message,
                };
            }
        };

        match self.client.get(image_url).send().await {
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
                        message: normalize_bark_error(status, &text),
                    }
                }
            }
            Err(e) => PushResult {
                success: false,
                message: format!("网络错误: {e}"),
            },
        }
    }

    async fn push_text_segment(
        &self,
        url: &str,
        segment: &PushSegment,
        group: Option<&str>,
    ) -> PushResult {
        let mut payload = serde_json::json!({
            "title": segment.title,
            "body": segment.body,
            "level": self.opts.bark_level,
            "autoCopy": if self.opts.bark_auto_copy { "1" } else { "0" },
            "isArchive": if self.opts.bark_archive { "1" } else { "0" },
        });

        if let Some(group_name) = group.filter(|value| !value.trim().is_empty()) {
            payload["group"] = serde_json::Value::String(group_name.to_string());
        }

        match self.client.post(url).json(&payload).send().await {
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
                        message: normalize_bark_error(status, &text),
                    }
                }
            }
            Err(e) => PushResult {
                success: false,
                message: format!("网络错误: {e}"),
            },
        }
    }

    fn resolve_endpoint_and_group(&self) -> Result<(String, Option<String>), PushResult> {
        let bark_url = self.creds.bark_url.trim_end_matches('/');
        let bark_key = self.creds.bark_key.trim();

        if bark_url.is_empty() || bark_key.is_empty() {
            return Err(PushResult {
                success: false,
                message: "Bark URL 或 Device Key 未配置".to_string(),
            });
        }

        Ok((
            format!("{bark_url}/{bark_key}"),
            resolve_group_name(&self.opts, self.group_key.as_deref()),
        ))
    }
}

fn resolve_group_name(opts: &PushOptions, group_key: Option<&str>) -> Option<String> {
    let group_key = group_key?.trim();
    if group_key.is_empty() {
        return None;
    }

    match opts.bark_group_mode.as_str() {
        "auto" => opts
            .bark_group_mapping
            .get(group_key)
            .cloned()
            .or_else(|| Some(group_key.to_string())),
        "custom" => opts.bark_group_mapping.get(group_key).cloned(),
        _ => None,
    }
}

fn normalize_bark_error(status: reqwest::StatusCode, text: &str) -> String {
    let message = serde_json::from_str::<BarkErrorBody>(text)
        .ok()
        .and_then(|body| body.message)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| text.trim().to_string());

    if message.contains("api.push.apple.com")
        || message.contains("push failed")
        || message.contains(":EOF")
    {
        return format!(
            "Bark 返回 {status}：服务已收到请求，但转发到 Apple Push 失败。通常是 Bark 服务端网络异常、设备推送令牌失效，或 iPhone 端 Bark 需要重新激活。原始信息：{message}"
        );
    }

    format!("Bark 返回 {status}: {message}")
}

fn chunk_text_payload(payload: &ProcessedPayload) -> Vec<PushSegment> {
    let text = &payload.content;
    let total_bytes = text.len();

    if total_bytes <= MAX_SEGMENT_BYTES {
        return vec![PushSegment {
            title: payload.display_source.clone(),
            body: text.clone(),
        }];
    }

    let mut chunks = Vec::new();
    let mut offset = 0;

    while offset < total_bytes {
        let end = std::cmp::min(offset + MAX_SEGMENT_BYTES, total_bytes);
        let safe_end = find_utf8_boundary(text, end);
        chunks.push(&text[offset..safe_end]);
        offset = safe_end;
    }

    let total_chunks = chunks.len();
    chunks
        .into_iter()
        .enumerate()
        .map(|(index, body)| PushSegment {
            title: format!("{} [{}/{}]", payload.display_source, index + 1, total_chunks),
            body: body.to_string(),
        })
        .collect()
}

fn find_utf8_boundary(text: &str, pos: usize) -> usize {
    let bytes = text.as_bytes();
    if pos >= bytes.len() {
        return bytes.len();
    }

    let mut boundary = pos;
    while boundary > 0 && (bytes[boundary] & 0b1100_0000) == 0b1000_0000 {
        boundary -= 1;
    }
    boundary
}

fn build_bark_image_url(
    bark_endpoint: &str,
    title: &str,
    image_url: &str,
    opts: &PushOptions,
    group: Option<&str>,
) -> Result<Url, String> {
    let mut url = Url::parse(bark_endpoint).map_err(|e| format!("Bark URL 无效: {e}"))?;

    url.path_segments_mut()
        .map_err(|_| "Bark URL 不支持追加图片标题路径".to_string())?
        .push(title);

    {
        let mut query = url.query_pairs_mut();
        query.append_pair("image", image_url);
        query.append_pair("level", &opts.bark_level);
        query.append_pair("autoCopy", if opts.bark_auto_copy { "1" } else { "0" });
        query.append_pair("isArchive", if opts.bark_archive { "1" } else { "0" });

        if let Some(group_name) = group.filter(|value| !value.trim().is_empty()) {
            query.append_pair("group", group_name);
        }
    }

    Ok(url)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    fn test_options() -> PushOptions {
        PushOptions {
            bark_level: "active".to_string(),
            bark_auto_copy: true,
            bark_archive: false,
            bark_group_mode: "disabled".to_string(),
            bark_group_mapping: HashMap::new(),
            image_strategy: "lan_server".to_string(),
            image_ttl_seconds: 180,
            webhook_payload_template: "{}".to_string(),
        }
    }

    #[test]
    fn test_chunk_text_payload_keeps_short_text_single_segment() {
        let payload = ProcessedPayload {
            display_type: "纯文本".to_string(),
            content: "短文本".to_string(),
            content_length: 3,
            display_source: "EcoPaste".to_string(),
        };

        let segments = chunk_text_payload(&payload);
        assert_eq!(segments.len(), 1);
        assert_eq!(segments[0].title, "EcoPaste");
    }

    #[test]
    fn test_chunk_text_payload_splits_long_text() {
        let payload = ProcessedPayload {
            display_type: "纯文本".to_string(),
            content: "测".repeat(1200),
            content_length: 1200,
            display_source: "EcoPaste - Chrome".to_string(),
        };

        let segments = chunk_text_payload(&payload);
        assert_eq!(segments.len(), 2);
        assert!(segments[0].title.contains("[1/2]"));
        assert!(segments[1].title.contains("[2/2]"));
    }

    #[test]
    fn test_build_bark_image_url_uses_title_path_and_image_query() {
        let options = test_options();
        let url = build_bark_image_url(
            "https://api.day.app/device-key",
            "EcoPaste - Chrome",
            "http://15.11.0.31:41234/api/read/temp/pJvmJLU4eE2-Uz1W6i1DZ5Le",
            &options,
            Some("image"),
        )
        .unwrap();

        assert_eq!(url.path(), "/device-key/EcoPaste%20-%20Chrome");

        let query = url.query_pairs().collect::<HashMap<_, _>>();
        assert_eq!(
            query.get("image").map(|value| value.as_ref()),
            Some("http://15.11.0.31:41234/api/read/temp/pJvmJLU4eE2-Uz1W6i1DZ5Le")
        );
        assert_eq!(query.get("group").map(|value| value.as_ref()), Some("image"));
    }
}
