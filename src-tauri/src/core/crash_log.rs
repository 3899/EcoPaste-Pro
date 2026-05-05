use std::{
    backtrace::Backtrace,
    fs::{create_dir_all, OpenOptions},
    io::Write,
    panic,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

fn crash_log_path() -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("APPDATA"))
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);

    base.join("EcoPaste").join("logs").join("crash.log")
}

fn timestamp() -> String {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => format!("unix_ms={}", duration.as_millis()),
        Err(_) => "unix_ms=unknown".to_string(),
    }
}

fn append(entry: &str) {
    let path = crash_log_path();

    if let Some(parent) = path.parent() {
        let _ = create_dir_all(parent);
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{entry}");
        let _ = file.flush();
    }
}

pub fn append_event(message: impl AsRef<str>) {
    append(&format!("[{}][event] {}", timestamp(), message.as_ref()));
}

pub fn install_panic_hook() {
    let default_hook = panic::take_hook();

    panic::set_hook(Box::new(move |info| {
        let thread = std::thread::current();
        let thread_name = thread.name().unwrap_or("unnamed");
        let location = info
            .location()
            .map(|location| {
                format!(
                    "{}:{}:{}",
                    location.file(),
                    location.line(),
                    location.column()
                )
            })
            .unwrap_or_else(|| "unknown".to_string());
        let backtrace = Backtrace::force_capture();

        append(&format!(
            "\n[{time}][panic] thread={thread_name} location={location}\n{info}\nbacktrace:\n{backtrace}\n",
            time = timestamp()
        ));

        default_hook(info);
    }));
}
