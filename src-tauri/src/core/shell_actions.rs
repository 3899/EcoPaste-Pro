use std::{fs, path::PathBuf};

const COPY_FILE_CONTENT_ARG: &str = "--copy-file-content";
const MAX_TEXT_FILE_SIZE: u64 = 2 * 1024 * 1024;

pub fn find_copy_file_content_path(args: &[String]) -> Option<PathBuf> {
    args.windows(2).find_map(|items| {
        if items[0] == COPY_FILE_CONTENT_ARG {
            Some(PathBuf::from(&items[1]))
        } else {
            None
        }
    })
}

pub fn has_shell_action(args: &[String]) -> bool {
    find_copy_file_content_path(args).is_some()
}

pub fn handle_copy_file_content_from_args(args: Vec<String>) {
    if let Some(path) = find_copy_file_content_path(&args) {
        tauri::async_runtime::spawn(async move {
            copy_file_content_to_clipboard(path).await;
        });
    }
}

async fn copy_file_content_to_clipboard(path: PathBuf) {
    let display_path = path.display().to_string();

    match read_text_file_content(&path) {
        Ok(content) => match tauri_plugin_clipboard_x::write_text(content).await {
            Ok(()) => {
                log::info!("Copied file content to clipboard: {display_path}");
                crate::core::crash_log::append_event(format!(
                    "Copied file content to clipboard: {display_path}"
                ));
            }
            Err(error) => {
                log::warn!("Failed to write file content to clipboard for {display_path}: {error}");
                crate::core::crash_log::append_event(format!(
                    "Failed to write file content to clipboard for {display_path}: {error}"
                ));
            }
        },
        Err(error) => {
            log::warn!("Skipped copying file content for {display_path}: {error}");
            crate::core::crash_log::append_event(format!(
                "Skipped copying file content for {display_path}: {error}"
            ));
        }
    }
}

fn read_text_file_content(path: &PathBuf) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|error| format!("metadata error: {error}"))?;

    if !metadata.is_file() {
        return Err("not a regular file".to_string());
    }

    let file_size = metadata.len();
    if file_size > MAX_TEXT_FILE_SIZE {
        return Err(format!("file is larger than {MAX_TEXT_FILE_SIZE} bytes"));
    }

    let bytes = fs::read(path).map_err(|error| format!("read error: {error}"))?;
    if bytes.iter().any(|byte| *byte == 0) {
        return Err("file appears to be binary".to_string());
    }

    String::from_utf8(bytes).map_err(|error| format!("utf-8 decode error: {error}"))
}
