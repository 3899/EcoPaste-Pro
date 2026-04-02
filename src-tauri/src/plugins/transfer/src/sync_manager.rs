use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

use crate::channels::PushChannel;
use crate::contract::{OutboundPayload, PreparedImagePayload};
use crate::credentials::TransferCredentials;
use crate::image_strategy;
use crate::processor::{build_display_source, content_group_key, process_clipboard_item};
use crate::push_provider::{PushOptions, PushResult};
use crate::receiver::ReceiverState;
use crate::temp_image::TempImageManager;

#[derive(Debug, Clone)]
pub struct PushTask {
    pub payload: OutboundPayload,
    pub provider: String,
    pub group_key: Option<String>,
    pub creds: TransferCredentials,
    pub opts: PushOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub value: String,
    #[serde(rename = "type")]
    pub content_type: String,
    #[serde(default)]
    pub subtype: Option<String>,
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default, rename = "isFromSync")]
    pub is_from_sync: bool,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub local_path: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NonSensitiveConfig {
    #[serde(default)]
    pub providers: Vec<String>,
    #[serde(default = "default_service_port")]
    pub service_port: u16,
    #[serde(default)]
    pub image_local_directory: String,
    #[serde(flatten)]
    pub push_options: PushOptions,
}

fn default_service_port() -> u16 {
    41234
}

pub fn create_push_queue() -> mpsc::Sender<PushTask> {
    let (tx, mut rx) = mpsc::channel::<PushTask>(50);

    tauri::async_runtime::spawn(async move {
        let client = Client::builder()
            .user_agent("EcoPaste")
            .build()
            .unwrap_or_default();

        while let Some(task) = rx.recv().await {
            let result = execute_push(&client, &task).await;
            if !result.success {
                log::warn!("推送失败: {}", result.message);
            }
        }
    });

    tx
}

async fn execute_push(client: &Client, task: &PushTask) -> PushResult {
    match PushChannel::from_provider(
        &task.provider,
        client,
        &task.creds,
        &task.opts,
        task.group_key.clone(),
    ) {
        Ok(channel) => channel.send(&task.payload).await,
        Err(message) => PushResult {
            success: false,
            message,
        },
    }
}

pub async fn enqueue_push(
    tx: &mpsc::Sender<PushTask>,
    item: &ClipboardItem,
    creds: &TransferCredentials,
    config: &NonSensitiveConfig,
    receiver_state: Arc<Mutex<ReceiverState>>,
    temp_image_manager: Arc<TempImageManager>,
) -> Result<String, String> {
    let providers = config.providers.clone();
    if providers.is_empty() {
        return Err("未启用任何推送通道".to_string());
    }

    let source = item.source.clone().unwrap_or_else(|| "EcoPaste".to_string());

    if item.content_type == "image" {
        return enqueue_image_push(
            tx,
            item,
            creds,
            config,
            &source,
            receiver_state,
            temp_image_manager,
        )
        .await;
    }

    let content = match item.search.as_ref().filter(|search| !search.is_empty()) {
        Some(search) => search.clone(),
        None => item.value.clone(),
    };
    let payload = process_clipboard_item(
        &content,
        &item.content_type,
        item.subtype.as_deref(),
        &source,
    )?;
    let group_key = content_group_key(&item.content_type, item.subtype.as_deref());

    for provider in &providers {
        let task = PushTask {
            payload: OutboundPayload::Text(payload.clone()),
            provider: provider.clone(),
            group_key: Some(group_key.clone()),
            creds: creds.clone(),
            opts: config.push_options.clone(),
        };

        if tx.try_send(task).is_err() {
            return Err("推送队列已满，请稍后重试".to_string());
        }
    }

    if providers.len() == 1 {
        Ok("已加入推送队列".to_string())
    } else {
        Ok(format!("已加入 {} 个通道的推送队列", providers.len()))
    }
}

async fn enqueue_image_push(
    tx: &mpsc::Sender<PushTask>,
    item: &ClipboardItem,
    creds: &TransferCredentials,
    config: &NonSensitiveConfig,
    source: &str,
    receiver_state: Arc<Mutex<ReceiverState>>,
    temp_image_manager: Arc<TempImageManager>,
) -> Result<String, String> {
    match config.push_options.image_strategy.as_str() {
        "reject" => {
            log::info!("图片推送已按策略拦截");
            return Ok("图片推送已按策略拦截".to_string());
        }
        "lan_server" | "webhook_server" | "webdav" | "localpath" => {}
        other => return Err(format!("未知图片中转策略: {other}")),
    }

    let local_path = item
        .local_path
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| {
            if item.value.contains('\\') || item.value.contains('/') {
                Some(item.value.as_str())
            } else {
                None
            }
        })
        .ok_or_else(|| "图片推送缺少本地文件路径".to_string())?;

    let path = Path::new(local_path);
    if !path.exists() {
        return Err(format!("图片文件不存在: {}", path.display()));
    }

    let prepared = image_strategy::prepare_image_direct_link(
        path,
        item.display_name.as_deref(),
        creds,
        config,
        &config.push_options,
        receiver_state,
        temp_image_manager,
    )
    .await?;
    let payload = OutboundPayload::Image(PreparedImagePayload {
        display_source: build_display_source(source),
        image_url: prepared.url,
        display_name: prepared.display_name.clone(),
    });

    for provider in &config.providers {
        let task = PushTask {
            payload: payload.clone(),
            provider: provider.clone(),
            group_key: Some("image".to_string()),
            creds: creds.clone(),
            opts: config.push_options.clone(),
        };

        if tx.try_send(task).is_err() {
            return Err("推送队列已满，请稍后重试".to_string());
        }
    }

    Ok(format!(
        "已加入图片直链推送队列（{}）",
        prepared.display_name
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::ProcessedPayload;

    fn test_config() -> NonSensitiveConfig {
        NonSensitiveConfig {
            providers: vec!["webhook".to_string()],
            service_port: 41234,
            image_local_directory: String::new(),
            push_options: PushOptions {
                bark_level: "active".to_string(),
                bark_auto_copy: true,
                bark_archive: false,
                bark_group_mode: "disabled".to_string(),
                bark_group_mapping: Default::default(),
                image_strategy: "lan_server".to_string(),
                image_ttl_seconds: 180,
                webhook_payload_template:
                    r#"{"类型":"{{类型标签}}","来源":"{{来源}}"}"#.to_string(),
            },
        }
    }

    #[tokio::test]
    async fn test_enqueue_push_uses_source_fallback_and_display_type() {
        let (tx, mut rx) = mpsc::channel::<PushTask>(1);
        let item = ClipboardItem {
            value: "hello".to_string(),
            content_type: "text".to_string(),
            subtype: Some("code_json".to_string()),
            search: None,
            is_from_sync: false,
            source: None,
            local_path: None,
            display_name: None,
        };

        enqueue_push(
            &tx,
            &item,
            &TransferCredentials::default(),
            &test_config(),
            Arc::new(Mutex::new(ReceiverState::default())),
            Arc::new(TempImageManager::new()),
        )
        .await
        .unwrap();

        let task = rx.recv().await.unwrap();
        assert_eq!(task.group_key.as_deref(), Some("code"));
        match task.payload {
            OutboundPayload::Text(ProcessedPayload {
                display_type,
                display_source,
                ..
            }) => {
                assert_eq!(display_type, "代码(JSON)");
                assert_eq!(display_source, "EcoPaste");
            }
            other => panic!("unexpected payload: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_enqueue_push_does_not_split_long_text_for_webhook() {
        let (tx, mut rx) = mpsc::channel::<PushTask>(2);
        let item = ClipboardItem {
            value: "测".repeat(1200),
            content_type: "text".to_string(),
            subtype: None,
            search: None,
            is_from_sync: false,
            source: Some("Chrome".to_string()),
            local_path: None,
            display_name: None,
        };
        let mut config = test_config();
        config.providers = vec!["webhook".to_string(), "bark".to_string()];

        enqueue_push(
            &tx,
            &item,
            &TransferCredentials::default(),
            &config,
            Arc::new(Mutex::new(ReceiverState::default())),
            Arc::new(TempImageManager::new()),
        )
        .await
        .unwrap();

        let first = rx.recv().await.unwrap();
        let second = rx.recv().await.unwrap();

        let tasks = vec![first, second];
        assert_eq!(tasks.len(), 2);
        assert!(tasks
            .into_iter()
            .all(|task| matches!(task.payload, OutboundPayload::Text(_))));
    }
}
