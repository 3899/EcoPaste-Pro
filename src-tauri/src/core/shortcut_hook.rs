use rdev::{EventType, Key};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
fn get_double_click_time() -> Duration {
    unsafe {
        #[link(name = "user32")]
        extern "system" {
            fn GetDoubleClickTime() -> u32;
        }
        let time = GetDoubleClickTime();
        if time > 0 {
            Duration::from_millis(time as u64)
        } else {
            Duration::from_millis(400)
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn get_double_click_time() -> Duration {
    Duration::from_millis(400) // Fallback for Mac/Linux
}

pub fn start_double_modifier_listener(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let mut threshold = get_double_click_time();
        if threshold > Duration::from_millis(600) {
            threshold = Duration::from_millis(600);
        }

        let mut last_key: Option<(Key, SystemTime)> = None;

        if let Err(error) = rdev::listen(move |event| {
            if let EventType::KeyPress(key) = event.event_type {
                let now = SystemTime::now();

                let modifier_str = match key {
                    Key::ControlLeft | Key::ControlRight => Some("Double_Control"),
                    Key::Alt | Key::AltGr => Some("Double_Alt"),
                    Key::ShiftLeft | Key::ShiftRight => Some("Double_Shift"),
                    Key::MetaLeft | Key::MetaRight => Some("Double_Command"),
                    _ => None,
                };

                if let Some(mod_str) = modifier_str {
                    if let Some((last_k, last_time)) = last_key {
                        if last_k == key {
                            if let Ok(elapsed) = now.duration_since(last_time) {
                                if elapsed <= threshold && elapsed.as_millis() > 50 {
                                    let _ = app_handle.emit("double_modifier_trigger", mod_str);
                                    last_key = None;
                                    return;
                                }
                            }
                        }
                    }
                    last_key = Some((key, now));
                } else {
                    last_key = None;
                }
            }
        }) {
            log::error!("Error starting rdev double-modifier listener: {error:?}");
            crate::core::crash_log::append_event(format!(
                "Error starting rdev double-modifier listener: {error:?}"
            ));
        }
    });
}
