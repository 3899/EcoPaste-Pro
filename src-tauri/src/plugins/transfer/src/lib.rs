use std::sync::{Arc, Mutex};
use tauri::{
    generate_handler,
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod contract;
mod credentials;
mod channels;
mod image_strategy;
mod network;
mod processor;
mod push_provider;
mod receiver;
mod sync_manager;
mod temp_image;
mod text_subtype;

pub use commands::*;
pub use credentials::TransferCredentials;
pub use network::NetworkInfo;
pub use push_provider::PushResult;
pub use receiver::ReceiverStatus;
pub use sync_manager::{ClipboardItem, NonSensitiveConfig};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("transfer")
        .invoke_handler(generate_handler![
            commands::set_transfer_config,
            commands::get_transfer_config,
            commands::test_push,
            commands::push_clipboard_item,
            commands::start_receiver,
            commands::stop_receiver,
            commands::get_receiver_status,
            commands::get_network_info,
        ])
        .setup(|app, _api| {
            // 创建推送队列
            let push_tx = sync_manager::create_push_queue();

            // 创建接收服务状态
            let receiver_state = Arc::new(Mutex::new(receiver::ReceiverState::default()));
            let temp_image_manager = Arc::new(temp_image::TempImageManager::new());

            let app_handle = app.app_handle().clone();
            let receiver_state_for_service = receiver_state.clone();
            let temp_image_manager_for_service = temp_image_manager.clone();

            // 注册插件状态
            app.manage(commands::TransferPluginState {
                push_tx,
                receiver_state,
                temp_image_manager,
            });

            tauri::async_runtime::spawn(async move {
                if let Err(error) = receiver::ensure_service(
                    app_handle,
                    41234,
                    receiver_state_for_service,
                    temp_image_manager_for_service,
                )
                .await
                {
                    log::warn!("公共传输服务预启动失败: {error}");
                }
            });

            Ok(())
        })
        .build()
}
