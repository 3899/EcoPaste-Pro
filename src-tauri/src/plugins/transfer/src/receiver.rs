use axum::{
    body::{to_bytes, Body},
    extract::{DefaultBodyLimit, FromRequest, Multipart, Path as AxumPath, Request, State as AxumState},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use chrono::TimeZone;
use encoding_rs::{Encoding, GB18030, UTF_16BE, UTF_16LE};
use image::ImageFormat;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_clipboard_x::{write_files, write_html, write_image, write_rtf, write_text};
use tokio::net::TcpListener;
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio_util::sync::CancellationToken;

use crate::temp_image::{ResolveTempImageError, TempImageManager};
use crate::text_subtype::detect_text_subtype;

const REMOTE_SOURCE_ICON_DATA_URL: &str = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024'><path fill='%231E88FE' d='M512 1024C229.248 1024 0 794.752 0 512S229.248 0 512 0s512 229.248 512 512-229.248 512-512 512z m142.250667-848.469333H369.749333c-26.453333 0-47.914667 20.992-47.914666 46.848v539.946666a47.36 47.36 0 0 0 47.914666 46.848h284.501334c26.453333 0 47.914667-20.992 47.914666-46.848V222.378667c0-25.856-21.461333-46.848-47.914666-46.848z m-181.845334 21.930666h79.274667c4.565333 0 8.234667 3.669333 8.234667 8.32a8.234667 8.234667 0 0 1-8.234667 8.234667h-79.274667a8.234667 8.234667 0 0 1-8.234666-8.234667 8.234667 8.234667 0 0 1 8.234666-8.32zM512 780.416a31.36 31.36 0 0 1-31.701333-31.018667c0-17.066667 14.208-30.976 31.701333-30.976s31.701333 13.866667 31.701333 30.976a31.36 31.36 0 0 1-31.701333 31.018667z m165.205333-130.346667c0 10.325333-8.533333 18.773333-19.157333 18.773334H365.952a18.901333 18.901333 0 0 1-19.157333-18.773334V252.16c0-10.325333 8.533333-18.773333 19.157333-18.773333h292.096c10.581333 0 19.157333 8.405333 19.157333 18.773333v397.866667z'/></svg>";

#[derive(Debug, Clone, Serialize)]
pub struct ReceiverStatus {
    pub running: bool,
    pub port: u16,
}

pub struct ReceiverState {
    pub cancel_token: Option<CancellationToken>,
    pub port: u16,
    pub running: bool,
    pub service_running: bool,
    pub task_handle: Option<JoinHandle<()>>,
    receive_config: Arc<Mutex<ReceiveConfig>>,
}

#[derive(Debug, Default, Clone)]
struct ReceiveConfig {
    enabled: bool,
    token: String,
    db_path: Option<PathBuf>,
    auto_copy: bool,
}

impl Default for ReceiverState {
    fn default() -> Self {
        Self {
            cancel_token: None,
            port: 41234,
            running: false,
            service_running: false,
            task_handle: None,
            receive_config: Arc::new(Mutex::new(ReceiveConfig::default())),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct WriteRequest {
    pub payload: String,
    #[serde(default = "default_type")]
    pub r#type: String,
    #[serde(default)]
    pub source: Option<String>,
}

fn default_type() -> String {
    "text".to_string()
}

#[derive(Debug, Serialize)]
pub struct WriteResponse {
    pub code: i32,
    pub message: String,
}

#[derive(Clone)]
struct AppState {
    receive_config: Arc<Mutex<ReceiveConfig>>,
    event_emitter: EventEmitterHandle,
    temp_image_manager: Arc<TempImageManager>,
}

#[derive(Clone)]
struct EventEmitterHandle {
    inner: Arc<dyn Fn(&str, &str) + Send + Sync>,
}

impl EventEmitterHandle {
    fn new<R: Runtime>(app: AppHandle<R>) -> Self {
        Self {
            inner: Arc::new(move |event: &str, payload: &str| {
                let _ = app.emit(event, payload.to_string());
            }),
        }
    }

    fn emit(&self, event: &str, payload: &str) {
        (self.inner)(event, payload);
    }
}

#[derive(Debug, Clone)]
struct ReceiveConfigSnapshot {
    enabled: bool,
    token: String,
    db_path: Option<PathBuf>,
    auto_copy: bool,
}

#[derive(Debug)]
struct StoredHistoryEntry {
    content_type: String,
    value: String,
    search: String,
    count: i64,
    width: Option<i64>,
    height: Option<i64>,
    value_size: i64,
    subtype: Option<String>,
}

#[derive(Debug)]
struct SavedImageRecord {
    file_name: String,
    full_path: PathBuf,
    file_size: i64,
    width: i64,
    height: i64,
}

#[derive(Debug)]
struct ParsedMultipartRequest {
    payload: ParsedPayload,
    source: Option<String>,
}

#[derive(Debug)]
enum ParsedPayload {
    Text {
        payload: String,
        content_type: String,
    },
    Image {
        bytes: Vec<u8>,
        content_type: Option<String>,
    },
}

#[derive(Debug)]
enum ClipboardTarget {
    Text(String),
    Html {
        text: String,
        html: String,
    },
    Rtf {
        text: String,
        rtf: String,
    },
    Image(PathBuf),
    Files(Vec<String>),
}

impl ClipboardTarget {
    fn kind(&self) -> &'static str {
        match self {
            Self::Text(_) => "text",
            Self::Html { .. } => "html",
            Self::Rtf { .. } => "rtf",
            Self::Image(_) => "image",
            Self::Files(_) => "files",
        }
    }
}

#[derive(Debug)]
struct ReceiveParseError {
    status: StatusCode,
    message: String,
}

pub async fn ensure_service<R: Runtime>(
    app: AppHandle<R>,
    port: u16,
    state: Arc<Mutex<ReceiverState>>,
    temp_image_manager: Arc<TempImageManager>,
) -> Result<(), String> {
    let (should_restart, receive_config) = {
        let s = state.lock().map_err(|e| e.to_string())?;
        (
            !s.service_running || s.port != port,
            Arc::clone(&s.receive_config),
        )
    };

    if !should_restart {
        return Ok(());
    }

    stop_service(state.clone()).await;

    let cancel_token = CancellationToken::new();
    let child_token = cancel_token.child_token();

    let app_state = AppState {
        receive_config,
        event_emitter: EventEmitterHandle::new(app),
        temp_image_manager,
    };

    let router = Router::new()
        .route("/api/write", post(handle_write))
        .route("/api/read/temp/:key", get(handle_read_temp_image))
        .layer(DefaultBodyLimit::disable())
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| format!("端口 {port} 绑定失败: {e}"))?;

    {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.cancel_token = Some(cancel_token);
        s.port = port;
        s.service_running = true;
    }

    let state_for_task = state.clone();
    let handle = tokio::spawn(async move {
        log::info!("接收服务已启动: 0.0.0.0:{port}");

        if let Err(err) = axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                child_token.cancelled().await;
            })
            .await
        {
            log::error!("接收服务异常退出: {err}");
        }

        if let Ok(mut s) = state_for_task.lock() {
            s.service_running = false;
            s.cancel_token = None;
            s.task_handle = None;
        }
    });

    if let Ok(mut s) = state.lock() {
        s.task_handle = Some(handle);
    }

    Ok(())
}

pub async fn start<R: Runtime>(
    app: AppHandle<R>,
    port: u16,
    token: String,
    db_path: PathBuf,
    auto_copy: bool,
    state: Arc<Mutex<ReceiverState>>,
    temp_image_manager: Arc<TempImageManager>,
) -> Result<(), String> {
    ensure_service(app, port, state.clone(), temp_image_manager).await?;

    let receive_config = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.port = port;
        s.running = true;
        Arc::clone(&s.receive_config)
    };

    let mut config = receive_config.lock().map_err(|e| e.to_string())?;
    config.enabled = true;
    config.token = token;
    config.db_path = Some(db_path);
    config.auto_copy = auto_copy;

    Ok(())
}

pub async fn stop(state: Arc<Mutex<ReceiverState>>) {
    stop_service(state.clone()).await;

    let receive_config = if let Ok(s) = state.lock() {
        Some(Arc::clone(&s.receive_config))
    } else {
        None
    };

    if let Some(receive_config) = receive_config {
        if let Ok(mut config) = receive_config.lock() {
            config.enabled = false;
            config.token.clear();
            config.db_path = None;
            config.auto_copy = false;
        }
    }
}

async fn stop_service(state: Arc<Mutex<ReceiverState>>) {
    let handle = if let Ok(mut s) = state.lock() {
        if let Some(token) = s.cancel_token.take() {
            token.cancel();
        }
        s.service_running = false;
        s.running = false;
        s.task_handle.take()
    } else {
        None
    };

    if let Some(h) = handle {
        let _ = h.await;
        log::info!("接收服务已完全停止并释放端口");
    }
}

pub fn status(state: Arc<Mutex<ReceiverState>>) -> ReceiverStatus {
    let (running, port) = if let Ok(s) = state.lock() {
        (s.running, s.port)
    } else {
        (false, 41234)
    };

    ReceiverStatus { running, port }
}

async fn handle_write(
    AxumState(state): AxumState<AppState>,
    request: Request,
) -> Response {
    let headers = request.headers().clone();

    let receive_config = match snapshot_receive_config(&state) {
        Ok(config) => config,
        Err(response) => return response,
    };

    if let Some(response) = reject_if_receive_disabled(&receive_config) {
        return response;
    }

    if let Some(response) = reject_if_auth_invalid(&headers, &receive_config.token) {
        return response;
    }

    let parsed = if is_multipart_request(&headers) {
        match parse_multipart_request(request).await {
            Ok(parsed) => parsed,
            Err(error) => return json_response(error.status, error.status.as_u16() as i32, error.message),
        }
    } else {
        let body = match to_bytes(request.into_body(), usize::MAX).await {
            Ok(body) => body,
            Err(error) => {
                return json_response(
                    StatusCode::BAD_REQUEST,
                    400,
                    format!("读取请求体失败: {error}"),
                )
            }
        };

        let body = match parse_write_request(&headers, body.as_ref()) {
            Ok(body) => body,
            Err(message) => return json_response(StatusCode::BAD_REQUEST, 400, message),
        };

        ParsedMultipartRequest {
            payload: ParsedPayload::Text {
                payload: body.payload,
                content_type: body.r#type,
            },
            source: body.source,
        }
    };

    let source = parsed
        .source
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "Remote".to_string());

    let Some(db_path) = receive_config.db_path.as_ref() else {
        return json_response(
            StatusCode::SERVICE_UNAVAILABLE,
            503,
            "自动接收服务未配置数据库路径".to_string(),
        );
    };

    let (entry, clipboard_target) = match prepare_received_content(db_path, parsed.payload).await {
        Ok(result) => result,
        Err(error) => return json_response(StatusCode::UNSUPPORTED_MEDIA_TYPE, 415, error),
    };

    if let Err(error) = write_to_db(db_path, &entry, &source) {
        return json_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            500,
            format!("写入失败: {error}"),
        );
    }

    state.event_emitter.emit("refresh-clipboard-list", "");
    state.event_emitter.emit("transfer-list-updated", "");

    let message = match maybe_autocopy_received_content(
        &state.event_emitter,
        &receive_config,
        &clipboard_target,
    )
    .await
    {
        Ok(()) => "Success".to_string(),
        Err(error) => {
            log::warn!("自动复制失败: {error}");
            format!("Success (auto copy failed: {error})")
        }
    };

    json_response(StatusCode::OK, 0, message)
}

async fn handle_read_temp_image(
    AxumState(state): AxumState<AppState>,
    AxumPath(key): AxumPath<String>,
) -> Response {
    match state.temp_image_manager.resolve(&key).await {
        Ok(image) => {
            let content_length = image.bytes.len().to_string();
            let content_disposition = build_content_disposition(&image.display_name);
            let mut response = Response::new(Body::from(image.bytes));
            *response.status_mut() = StatusCode::OK;

            let headers = response.headers_mut();
            headers.insert(
                header::CONTENT_TYPE,
                HeaderValue::from_str(&image.media_type)
                    .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
            );
            headers.insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static("no-store, no-cache, must-revalidate, max-age=0"),
            );
            headers.insert(
                header::CONTENT_LENGTH,
                HeaderValue::from_str(&content_length)
                    .unwrap_or_else(|_| HeaderValue::from_static("0")),
            );
            if let Some(content_disposition) = content_disposition {
                headers.insert(header::CONTENT_DISPOSITION, content_disposition);
            }

            response
        }
        Err(ResolveTempImageError::Expired) => json_response(
            StatusCode::GONE,
            410,
            "图片链接已过期".to_string(),
        ),
        Err(ResolveTempImageError::NotFound) => {
            json_response(StatusCode::NOT_FOUND, 404, "图片不存在".to_string())
        }
        Err(ResolveTempImageError::Io(error)) => json_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            500,
            format!("读取图片失败: {error}"),
        ),
    }
}

fn snapshot_receive_config(state: &AppState) -> Result<ReceiveConfigSnapshot, Response> {
    state
        .receive_config
        .lock()
        .map(|config| ReceiveConfigSnapshot {
            enabled: config.enabled,
            token: config.token.clone(),
            db_path: config.db_path.clone(),
            auto_copy: config.auto_copy,
        })
        .map_err(|_| {
            json_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                500,
                "接收服务状态异常".to_string(),
            )
        })
}

fn reject_if_receive_disabled(config: &ReceiveConfigSnapshot) -> Option<Response> {
    (!config.enabled).then(|| {
        json_response(
            StatusCode::SERVICE_UNAVAILABLE,
            503,
            "自动接收服务未启用".to_string(),
        )
    })
}

fn reject_if_auth_invalid(headers: &HeaderMap, token: &str) -> Option<Response> {
    if token.is_empty() {
        return None;
    }

    let auth = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let expected = format!("Bearer {token}");

    (auth != expected).then(|| json_response(StatusCode::UNAUTHORIZED, 401, "Unauthorized".to_string()))
}

fn is_multipart_request(headers: &HeaderMap) -> bool {
    headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_ascii_lowercase().starts_with("multipart/form-data"))
        .unwrap_or(false)
}

async fn parse_multipart_request(request: Request) -> Result<ParsedMultipartRequest, ReceiveParseError> {
    let mut multipart = Multipart::from_request(request, &())
        .await
        .map_err(|error| ReceiveParseError {
            status: StatusCode::BAD_REQUEST,
            message: error.body_text(),
        })?;

    let mut payload = None;
    let mut source = None;

    while let Some(field) = multipart.next_field().await.map_err(|error| ReceiveParseError {
        status: StatusCode::BAD_REQUEST,
        message: error.to_string(),
    })? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "source" {
            let bytes = field.bytes().await.map_err(|error| ReceiveParseError {
                status: StatusCode::BAD_REQUEST,
                message: error.to_string(),
            })?;
            source = Some(String::from_utf8_lossy(&bytes).trim().to_string());
            continue;
        }

        if name != "payload" {
            continue;
        }

        let content_type = field.content_type().map(|value| value.to_string());
        let bytes = field.bytes().await.map_err(|error| ReceiveParseError {
            status: StatusCode::BAD_REQUEST,
            message: error.to_string(),
        })?;

        if bytes.is_empty() {
            return Err(ReceiveParseError {
                status: StatusCode::BAD_REQUEST,
                message: "payload 不能为空".to_string(),
            });
        }

        if content_type
            .as_deref()
            .map(|value| value.starts_with("image/"))
            .unwrap_or(false)
            || image::guess_format(&bytes).is_ok()
        {
            payload = Some(ParsedPayload::Image {
                bytes: bytes.to_vec(),
                content_type,
            });
            continue;
        }

        let is_text_payload = content_type
            .as_deref()
            .map(|value| value.starts_with("text/plain"))
            .unwrap_or(true);

        if !is_text_payload {
            return Err(ReceiveParseError {
                status: StatusCode::UNSUPPORTED_MEDIA_TYPE,
                message: format!(
                    "payload 类型不受支持: {}",
                    content_type.unwrap_or_else(|| "unknown".to_string())
                ),
            });
        }

        let payload_text = String::from_utf8(bytes.to_vec()).map_err(|_| ReceiveParseError {
            status: StatusCode::BAD_REQUEST,
            message: "文本 payload 不是有效的 UTF-8".to_string(),
        })?;
        payload = Some(ParsedPayload::Text {
            payload: payload_text,
            content_type: "text".to_string(),
        });
    }

    let Some(payload) = payload else {
        return Err(ReceiveParseError {
            status: StatusCode::BAD_REQUEST,
            message: "缺少 payload 字段".to_string(),
        });
    };

    Ok(ParsedMultipartRequest { payload, source })
}

async fn prepare_received_content(
    db_path: &Path,
    payload: ParsedPayload,
) -> Result<(StoredHistoryEntry, ClipboardTarget), String> {
    match payload {
        ParsedPayload::Image {
            bytes,
            content_type,
        } => {
            let saved = save_received_image(db_path, &bytes, content_type.as_deref()).await?;
            let file_name = saved.file_name.clone();
            Ok((
                StoredHistoryEntry {
                    content_type: "image".to_string(),
                    value: file_name.clone(),
                    search: file_name,
                    count: saved.file_size,
                    width: Some(saved.width),
                    height: Some(saved.height),
                    value_size: saved.file_size,
                    subtype: None,
                },
                ClipboardTarget::Image(saved.full_path),
            ))
        }
        ParsedPayload::Text {
            payload,
            content_type,
        } => prepare_received_text_payload(payload, content_type),
    }
}

fn prepare_received_text_payload(
    payload: String,
    content_type: String,
) -> Result<(StoredHistoryEntry, ClipboardTarget), String> {
    match normalize_content_type(&content_type) {
        "image" => Err("JSON 图片接收暂不支持，请使用 multipart/form-data".to_string()),
        "html" => {
            let count = payload.chars().count() as i64;
            let value_size = payload.len() as i64;
            let html = payload.clone();
            Ok((
                StoredHistoryEntry {
                    content_type: "html".to_string(),
                    value: payload.clone(),
                    search: payload.clone(),
                    count,
                    width: None,
                    height: None,
                    value_size,
                    subtype: None,
                },
                ClipboardTarget::Html { text: payload, html },
            ))
        }
        "rtf" => {
            let count = payload.chars().count() as i64;
            let value_size = payload.len() as i64;
            let rtf = payload.clone();
            Ok((
                StoredHistoryEntry {
                    content_type: "rtf".to_string(),
                    value: payload.clone(),
                    search: payload.clone(),
                    count,
                    width: None,
                    height: None,
                    value_size,
                    subtype: None,
                },
                ClipboardTarget::Rtf { text: payload, rtf },
            ))
        }
        "files" => {
            let files = parse_files_payload(&payload);
            Ok((
                StoredHistoryEntry {
                    content_type: "files".to_string(),
                    value: payload.clone(),
                    search: files.join(" "),
                    count: 0,
                    width: None,
                    height: None,
                    value_size: payload.len() as i64,
                    subtype: None,
                },
                ClipboardTarget::Files(files),
            ))
        }
        _ => {
            let subtype = detect_text_subtype(&payload);
            let trimmed = payload.trim();
            let normalize_trimmed = matches!(
                subtype.as_deref(),
                Some("url") | Some("email") | Some("color") | Some("path")
            );
            let value = if normalize_trimmed {
                trimmed.to_string()
            } else {
                payload.clone()
            };
            let search = if normalize_trimmed {
                trimmed.to_string()
            } else {
                payload.clone()
            };

            Ok((
                StoredHistoryEntry {
                    content_type: "text".to_string(),
                    value: value.clone(),
                    search,
                    count: value.chars().count() as i64,
                    width: None,
                    height: None,
                    value_size: payload.len() as i64,
                    subtype,
                },
                ClipboardTarget::Text(value),
            ))
        }
    }
}

fn normalize_content_type(content_type: &str) -> &str {
    match content_type.trim().to_ascii_lowercase().as_str() {
        "html" => "html",
        "rtf" => "rtf",
        "files" => "files",
        "image" => "image",
        _ => "text",
    }
}

fn parse_files_payload(payload: &str) -> Vec<String> {
    if let Ok(parsed) = serde_json::from_str::<Vec<String>>(payload) {
        return parsed.into_iter().filter(|item| !item.trim().is_empty()).collect();
    }

    payload
        .split('\n')
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

async fn save_received_image(
    db_path: &Path,
    bytes: &[u8],
    content_type: Option<&str>,
) -> Result<SavedImageRecord, String> {
    let images_dir = db_path
        .parent()
        .ok_or_else(|| "数据库路径无效，无法推导 images 目录".to_string())?
        .join("images");

    std::fs::create_dir_all(&images_dir).map_err(|e| format!("创建图片目录失败: {e}"))?;

    let normalized_content_type = content_type.unwrap_or("").trim().to_ascii_lowercase();
    if normalized_content_type == "image/svg+xml" {
        return Err("当前自动接收不支持 SVG 矢量图，请先转换为 PNG 或 JPEG".to_string());
    }
    if normalized_content_type == "image/heic" || normalized_content_type == "image/heif" {
        return Err("当前自动接收不支持 HEIC/HEIF，请先转换为 PNG 或 JPEG".to_string());
    }

    let dynamic_image = image::load_from_memory(bytes)
        .map_err(|e| {
            let format_hint = image::guess_format(bytes)
                .map(|format| format!("{format:?}"))
                .unwrap_or_else(|_| {
                    if normalized_content_type.is_empty() {
                        "unknown".to_string()
                    } else {
                        normalized_content_type.clone()
                    }
                });
            format!(
                "解析图片失败: {e}。当前自动接收支持 PNG/JPEG/GIF/WebP/BMP/ICO/TIFF/AVIF，收到格式: {format_hint}"
            )
        })?;
    let width = i64::from(dynamic_image.width());
    let height = i64::from(dynamic_image.height());
    let mut hasher = DefaultHasher::new();
    dynamic_image.as_bytes().hash(&mut hasher);
    let hash = hasher.finish();

    let file_name = format!("{hash}.png");
    let full_path = images_dir.join(&file_name);

    if !full_path.exists() {
        dynamic_image
            .save_with_format(&full_path, ImageFormat::Png)
            .map_err(|e| format!("保存图片失败: {e}"))?;
    }

    let file_size = std::fs::metadata(&full_path)
        .map_err(|e| format!("读取图片大小失败: {e}"))?
        .len() as i64;

    Ok(SavedImageRecord {
        file_name,
        full_path,
        file_size,
        width,
        height,
    })
}

async fn maybe_autocopy_received_content(
    event_emitter: &EventEmitterHandle,
    config: &ReceiveConfigSnapshot,
    target: &ClipboardTarget,
) -> Result<(), String> {
    if !config.auto_copy {
        return Ok(());
    }

    event_emitter.emit("transfer-autocopy-guard", target.kind());
    sleep(Duration::from_millis(50)).await;

    match target {
        ClipboardTarget::Text(text) => write_text(text.clone()).await,
        ClipboardTarget::Html { text, html } => write_html(text.clone(), html.clone()).await,
        ClipboardTarget::Rtf { text, rtf } => write_rtf(text.clone(), rtf.clone()).await,
        ClipboardTarget::Image(path) => write_image(path.to_string_lossy().into_owned()).await,
        ClipboardTarget::Files(files) => write_files(files.clone()).await,
    }
}

fn build_content_disposition(display_name: &str) -> Option<HeaderValue> {
    let sanitized = display_name
        .chars()
        .filter(|ch| ch.is_ascii() && *ch != '"' && *ch != '\\' && !ch.is_ascii_control())
        .collect::<String>();

    if sanitized.is_empty() {
        return None;
    }

    HeaderValue::from_str(&format!("inline; filename=\"{sanitized}\"")).ok()
}

fn parse_write_request(headers: &HeaderMap, body: &[u8]) -> Result<WriteRequest, String> {
    if body.is_empty() {
        return Err("请求体不能为空".to_string());
    }

    if let Some(charset) = parse_charset(headers) {
        if let Some(request) = parse_json_with_encoding(body, charset) {
            return Ok(request);
        }
    }

    if let Some(request) = parse_json_from_utf8(body) {
        return Ok(request);
    }

    if let Some(request) = parse_json_from_utf16_bom(body) {
        return Ok(request);
    }

    for encoding in [GB18030, UTF_16LE, UTF_16BE] {
        if let Some(request) = parse_json_with_encoding(body, encoding) {
            return Ok(request);
        }
    }

    Err("请求体不是有效的 JSON，或字符编码不受支持".to_string())
}

fn parse_charset(headers: &HeaderMap) -> Option<&'static Encoding> {
    let content_type = headers.get("content-type")?.to_str().ok()?;

    for part in content_type.split(';').skip(1) {
        let mut kv = part.trim().splitn(2, '=');
        let key = kv.next()?.trim();
        let value = kv.next()?.trim().trim_matches('"');

        if key.eq_ignore_ascii_case("charset") {
            return Encoding::for_label(value.as_bytes());
        }
    }

    None
}

fn parse_json_from_utf8(body: &[u8]) -> Option<WriteRequest> {
    let body = body.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(body);
    let text = std::str::from_utf8(body).ok()?;
    serde_json::from_str(text).ok()
}

fn parse_json_from_utf16_bom(body: &[u8]) -> Option<WriteRequest> {
    if let Some(body) = body.strip_prefix(&[0xFF, 0xFE]) {
        return parse_json_with_encoding(body, UTF_16LE);
    }

    if let Some(body) = body.strip_prefix(&[0xFE, 0xFF]) {
        return parse_json_with_encoding(body, UTF_16BE);
    }

    None
}

fn parse_json_with_encoding(body: &[u8], encoding: &'static Encoding) -> Option<WriteRequest> {
    let text = encoding
        .decode_without_bom_handling_and_without_replacement(body)?
        .into_owned();

    serde_json::from_str(&text).ok()
}

fn write_to_db(db_path: &Path, entry: &StoredHistoryEntry, source: &str) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let id = nanoid::nanoid!();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let create_time = format_timestamp(now as u64);

    let group = match entry.content_type.as_str() {
        "image" => "image",
        "files" => "files",
        _ => "text",
    };

    conn.execute(
        "INSERT INTO history (id, type, \"group\", value, search, count, width, height, favorite, createTime, isFromSync, subtype, sourceAppName, sourceAppIcon, value_size)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, 1, ?10, ?11, ?12, ?13)",
        params![
            id,
            entry.content_type,
            group,
            entry.value,
            entry.search,
            entry.count,
            entry.width,
            entry.height,
            create_time,
            entry.subtype,
            source,
            REMOTE_SOURCE_ICON_DATA_URL,
            entry.value_size,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn format_timestamp(millis: u64) -> String {
    chrono::Local
        .timestamp_millis_opt(millis as i64)
        .single()
        .unwrap_or_else(chrono::Local::now)
        .format("%Y-%m-%d %H:%M:%S")
        .to_string()
}

fn json_response(status: StatusCode, code: i32, message: String) -> Response {
    (status, Json(WriteResponse { code, message })).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_files_payload_supports_json_and_lines() {
        assert_eq!(
            parse_files_payload(r#"["C:\\a.txt","C:\\b.txt"]"#),
            vec!["C:\\a.txt".to_string(), "C:\\b.txt".to_string()]
        );
        assert_eq!(
            parse_files_payload("C:\\a.txt\nC:\\b.txt"),
            vec!["C:\\a.txt".to_string(), "C:\\b.txt".to_string()]
        );
    }

    #[test]
    fn normalize_content_type_rejects_unknowns_to_text() {
        assert_eq!(normalize_content_type("text"), "text");
        assert_eq!(normalize_content_type("html"), "html");
        assert_eq!(normalize_content_type("unknown"), "text");
    }
}

