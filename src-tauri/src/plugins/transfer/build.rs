const COMMANDS: &[&str] = &[
    "set_transfer_config",
    "get_transfer_config",
    "test_push",
    "push_clipboard_item",
    "start_receiver",
    "stop_receiver",
    "get_receiver_status",
    "get_network_info",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
