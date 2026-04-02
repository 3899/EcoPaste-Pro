use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Runtime};
use tokio::sync::mpsc;

use crate::channels::PushChannel;
use crate::contract::OutboundPayload;
use crate::credentials::{load_credentials, save_credentials, TransferCredentials};
use crate::network::{self, NetworkInfo};
use crate::push_provider::{PushOptions, PushResult};
use crate::receiver::{self, ReceiverState, ReceiverStatus};
use crate::processor::process_clipboard_item;
use crate::sync_manager::{enqueue_push, ClipboardItem, NonSensitiveConfig, PushTask};
use crate::temp_image::TempImageManager;

/// 插件共享状态（通过 tauri::State 管理）
pub struct TransferPluginState {
    pub push_tx: mpsc::Sender<PushTask>,
    pub receiver_state: Arc<Mutex<ReceiverState>>,
    pub temp_image_manager: Arc<TempImageManager>,
}

// ── 凭据管理 ───────────────────────────────────────────────────────

#[command]
pub async fn set_transfer_config(config: TransferCredentials) -> Result<(), String> {
    save_credentials(&config)
}

#[command]
pub async fn get_transfer_config() -> Result<Option<TransferCredentials>, String> {
    load_credentials()
}

// ── 推送 ─────────────────────────────────────────────────────────

#[command]
pub async fn test_push(
    config: TransferCredentials,
    non_sensitive: NonSensitiveConfig,
) -> Result<PushResult, String> {
    let client = reqwest::Client::builder()
        .user_agent("EcoPaste")
        .build()
        .map_err(|e| e.to_string())?;
    let text_only_options = PushOptions {
        bark_level: non_sensitive.push_options.bark_level.clone(),
        bark_auto_copy: non_sensitive.push_options.bark_auto_copy,
        bark_archive: non_sensitive.push_options.bark_archive,
        bark_group_mode: non_sensitive.push_options.bark_group_mode.clone(),
        bark_group_mapping: non_sensitive.push_options.bark_group_mapping.clone(),
        image_strategy: "reject".to_string(),
        image_ttl_seconds: 180,
        webhook_payload_template: non_sensitive.push_options.webhook_payload_template.clone(),
    };

    let result = match non_sensitive.providers.first().map(String::as_str) {
        None => PushResult {
            success: false,
            message: "未启用任何推送通道".to_string(),
        },
        Some(provider) => match PushChannel::from_provider(
            provider,
            &client,
            &config,
            &text_only_options,
            Some("text".to_string()),
        ) {
            Ok(channel) => {
                let payload = match process_clipboard_item(
                    "🎉 恭喜！推送通道连接成功",
                    "text",
                    None,
                    "EcoPaste",
                ) {
                    Ok(payload) => OutboundPayload::Text(payload),
                    Err(message) => {
                        return Ok(PushResult {
                            success: false,
                            message,
                        })
                    }
                };

                channel.send(&payload).await
            }
            Err(message) => PushResult {
                success: false,
                message,
            },
        },
    };

    Ok(result)
}

#[command]
pub async fn push_clipboard_item<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, TransferPluginState>,
    item: ClipboardItem,
    config: TransferCredentials,
    non_sensitive: NonSensitiveConfig,
) -> Result<String, String> {
    if item.content_type == "image" && non_sensitive.push_options.image_strategy == "lan_server" {
        receiver::ensure_service(
            app,
            non_sensitive.service_port,
            state.receiver_state.clone(),
            state.temp_image_manager.clone(),
        )
        .await?;
    }

    enqueue_push(
        &state.push_tx,
        &item,
        &config,
        &non_sensitive,
        state.receiver_state.clone(),
        state.temp_image_manager.clone(),
    )
    .await
}

// ── 接收服务 ─────────────────────────────────────────────────

#[command]
pub async fn start_receiver<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, TransferPluginState>,
    port: u16,
    token: String,
    db_path: String,
    auto_copy: bool,
) -> Result<(), String> {
    let path = PathBuf::from(db_path);
    receiver::start(
        app,
        port,
        token,
        path,
        auto_copy,
        state.receiver_state.clone(),
        state.temp_image_manager.clone(),
    )
    .await
}

#[command]
pub async fn stop_receiver(
    state: tauri::State<'_, TransferPluginState>,
) -> Result<(), String> {
    receiver::stop(state.receiver_state.clone()).await;
    Ok(())
}

#[command]
pub async fn get_receiver_status(
    state: tauri::State<'_, TransferPluginState>,
) -> Result<ReceiverStatus, String> {
    Ok(receiver::status(state.receiver_state.clone()))
}

#[command]
pub async fn get_network_info() -> Result<NetworkInfo, String> {
    Ok(network::get_network_info())
}
