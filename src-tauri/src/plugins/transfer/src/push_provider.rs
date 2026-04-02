use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 推送结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushResult {
    pub success: bool,
    pub message: String,
}

/// 推送选项（来自非敏感配置）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushOptions {
    /// Bark: 时效性策略 (active / timeSensitive / passive)
    #[serde(default = "default_bark_level")]
    pub bark_level: String,
    /// Bark: 手机端自动复制
    #[serde(default = "default_true")]
    pub bark_auto_copy: bool,
    /// Bark: 保留历史记录
    #[serde(default)]
    pub bark_archive: bool,
    /// Bark: 分组模式 (disabled / auto / custom)
    #[serde(default = "default_bark_group_mode")]
    pub bark_group_mode: String,
    /// Bark: 自定义标签→分组映射 (JSON)
    #[serde(default)]
    pub bark_group_mapping: HashMap<String, String>,
    #[serde(default = "default_image_strategy")]
    pub image_strategy: String,
    #[serde(default = "default_image_ttl_seconds")]
    pub image_ttl_seconds: u64,
    /// Webhook: Payload 模板
    #[serde(default = "default_webhook_template")]
    pub webhook_payload_template: String,
}

fn default_bark_level() -> String {
    "active".to_string()
}
fn default_true() -> bool {
    true
}
fn default_bark_group_mode() -> String {
    "disabled".to_string()
}
fn default_image_strategy() -> String {
    "reject".to_string()
}
fn default_image_ttl_seconds() -> u64 {
    180
}
fn default_webhook_template() -> String {
    r#"{
  "msg_type": "text",
  "content": {
    "text": "{{剪贴板内容}}"
  }
}"#
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn test_default_webhook_template_is_valid_json() {
        let payload = test_options(&default_webhook_template());
        assert!(serde_json::from_str::<serde_json::Value>(&payload.webhook_payload_template).is_ok());
    }
}
