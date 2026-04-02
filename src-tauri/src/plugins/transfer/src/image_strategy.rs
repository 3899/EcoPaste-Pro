use mime_guess::MimeGuess;
use nanoid::nanoid;
use reqwest::header::{HeaderName, HeaderValue, CONTENT_TYPE};
use reqwest::{multipart, Client, Method, RequestBuilder, Url};
use serde_json::Value;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::credentials::TransferCredentials;
use crate::network;
use crate::push_provider::PushOptions;
use crate::receiver::ReceiverState;
use crate::sync_manager::NonSensitiveConfig;
use crate::temp_image::TempImageManager;

pub struct PreparedImageLink {
    pub url: String,
    pub display_name: String,
}

pub async fn prepare_image_direct_link(
    source_path: &Path,
    display_name: Option<&str>,
    creds: &TransferCredentials,
    non_sensitive: &NonSensitiveConfig,
    opts: &PushOptions,
    receiver_state: Arc<Mutex<ReceiverState>>,
    temp_image_manager: Arc<TempImageManager>,
) -> Result<PreparedImageLink, String> {
    let client = Client::builder()
        .user_agent("EcoPaste")
        .build()
        .map_err(|error| error.to_string())?;

    match opts.image_strategy.as_str() {
        "lan_server" => prepare_lan_server_link(
            source_path,
            display_name,
            creds,
            opts,
            receiver_state,
            temp_image_manager,
        )
        .await,
        "webhook_server" => {
            prepare_webhook_server_link(&client, source_path, display_name, creds).await
        }
        "webdav" => prepare_webdav_link(&client, source_path, display_name, creds).await,
        "localpath" => {
            prepare_localpath_link(source_path, display_name, creds, non_sensitive).await
        }
        other => Err(format!("未知图片中转策略: {other}")),
    }
}

async fn prepare_lan_server_link(
    source_path: &Path,
    display_name: Option<&str>,
    creds: &TransferCredentials,
    opts: &PushOptions,
    receiver_state: Arc<Mutex<ReceiverState>>,
    temp_image_manager: Arc<TempImageManager>,
) -> Result<PreparedImageLink, String> {
    let port = {
        let state = receiver_state.lock().map_err(|e| e.to_string())?;
        if !state.service_running {
            return Err("图片直链公共服务启动失败，请稍后重试".to_string());
        }
        state.port
    };

    let prepared = temp_image_manager
        .prepare_from_path(source_path, display_name, opts.image_ttl_seconds)
        .await?;
    let base_url = network::build_read_base_url(&creds.tunnel_address, port);

    Ok(PreparedImageLink {
        url: format!("{base_url}/api/read/temp/{}", prepared.key),
        display_name: prepared.display_name,
    })
}

async fn prepare_webhook_server_link(
    client: &Client,
    source_path: &Path,
    display_name: Option<&str>,
    creds: &TransferCredentials,
) -> Result<PreparedImageLink, String> {
    let upload_url = normalize_http_url(&creds.image_webhook_upload_url)
        .ok_or("请先配置图片上传接口".to_string())?;
    let (opaque_name, display_name, media_type) = derive_object_names(source_path, display_name)?;
    let bytes = tokio::fs::read(source_path)
        .await
        .map_err(|error| format!("读取图片文件失败: {error}"))?;
    let file_part = multipart::Part::bytes(bytes)
        .file_name(opaque_name.clone())
        .mime_str(&media_type)
        .map_err(|error| error.to_string())?;
    let form = multipart::Form::new()
        .part("file", file_part)
        .text("file_name", opaque_name.clone())
        .text("display_name", display_name.clone())
        .text("content_type", media_type.clone());

    let request = apply_json_headers(
        client.post(upload_url).multipart(form),
        &creds.image_webhook_headers,
    )?;
    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(format!("Webhook 图片上传失败: {status} {body}"));
    }

    let url = resolve_external_direct_url(
        &body,
        &creds.image_webhook_public_base,
        &opaque_name,
    )?;

    Ok(PreparedImageLink { url, display_name })
}

async fn prepare_webdav_link(
    client: &Client,
    source_path: &Path,
    display_name: Option<&str>,
    creds: &TransferCredentials,
) -> Result<PreparedImageLink, String> {
    let config = WebdavImageConfig {
        address: creds.image_webdav_url.clone(),
        username: creds.image_webdav_username.clone(),
        password: creds.image_webdav_password.clone(),
        path: creds.image_webdav_path.clone(),
        public_base: creds.image_webdav_public_base.clone(),
    };

    if config.address.trim().is_empty() {
        return Err("请先配置 WebDAV 服务器地址".to_string());
    }
    if config.username.trim().is_empty() {
        return Err("请先配置 WebDAV 用户名".to_string());
    }
    if config.password.is_empty() {
        return Err("请先配置 WebDAV 密码".to_string());
    }
    if config.public_base.trim().is_empty() {
        return Err("请先配置 WebDAV 公开 Web 直链前缀".to_string());
    }

    ensure_webdav_remote_dir(client, &config).await?;

    let (opaque_name, display_name, media_type) = derive_object_names(source_path, display_name)?;
    let bytes = tokio::fs::read(source_path)
        .await
        .map_err(|error| format!("读取图片文件失败: {error}"))?;
    let upload_url = build_webdav_base_url(&config)?
        .join(&opaque_name)
        .map_err(|error| error.to_string())?;
    let response = client
        .put(upload_url)
        .basic_auth(&config.username, Some(&config.password))
        .header(CONTENT_TYPE, media_type)
        .body(bytes)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("WebDAV 图片上传失败: {status} {body}"));
    }

    Ok(PreparedImageLink {
        url: join_public_url(&config.public_base, &opaque_name)?,
        display_name,
    })
}

async fn prepare_localpath_link(
    source_path: &Path,
    display_name: Option<&str>,
    creds: &TransferCredentials,
    non_sensitive: &NonSensitiveConfig,
) -> Result<PreparedImageLink, String> {
    let directory = non_sensitive.image_local_directory.trim();
    if directory.is_empty() {
        return Err("请先配置本地写入目录".to_string());
    }
    if creds.image_local_public_base.trim().is_empty() {
        return Err("请先配置本地目录公开 Web 直链前缀".to_string());
    }

    let (opaque_name, display_name, _) = derive_object_names(source_path, display_name)?;
    let target_dir = PathBuf::from(directory);
    tokio::fs::create_dir_all(&target_dir)
        .await
        .map_err(|error| format!("创建本地目录失败: {error}"))?;
    let target_path = target_dir.join(&opaque_name);

    if tokio::fs::hard_link(source_path, &target_path).await.is_err() {
        tokio::fs::copy(source_path, &target_path)
            .await
            .map_err(|error| format!("写入本地目录失败: {error}"))?;
    }

    Ok(PreparedImageLink {
        url: join_public_url(&creds.image_local_public_base, &opaque_name)?,
        display_name,
    })
}

fn derive_object_names(
    source_path: &Path,
    display_name: Option<&str>,
) -> Result<(String, String, String), String> {
    let media_type = infer_image_media_type(source_path)?;
    let ext = source_path
        .extension()
        .and_then(OsStr::to_str)
        .filter(|value| !value.trim().is_empty())
        .map(|value| format!(".{value}"))
        .unwrap_or_default();
    let opaque_name = format!("{}{}", nanoid!(24), ext);
    let display_name = display_name
        .filter(|value| !value.trim().is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| {
            source_path
                .file_name()
                .map(|value| value.to_string_lossy().into_owned())
                .unwrap_or_else(|| opaque_name.clone())
        });

    Ok((opaque_name, display_name, media_type))
}

fn infer_image_media_type(path: &Path) -> Result<String, String> {
    let guess = MimeGuess::from_path(path)
        .first_raw()
        .map(str::to_owned)
        .unwrap_or_default();

    if guess.starts_with("image/") {
        return Ok(guess);
    }

    Err(format!("无法识别图片类型: {}", path.display()))
}

fn normalize_http_url(value: &str) -> Option<String> {
    network::normalize_external_base_url(value)
}

fn join_public_url(base: &str, path_or_name: &str) -> Result<String, String> {
    let path_or_name = path_or_name.trim();
    if path_or_name.is_empty() {
        return Err("中转服务没有返回可用的文件路径".to_string());
    }
    if path_or_name.starts_with("http://") || path_or_name.starts_with("https://") {
        return Ok(path_or_name.to_string());
    }

    let base = normalize_http_url(base).ok_or("请先配置公开 Web 直链前缀".to_string())?;
    let path = path_or_name.trim_start_matches('/');
    Ok(format!("{base}/{path}"))
}

fn apply_json_headers(
    mut request: RequestBuilder,
    raw_headers: &str,
) -> Result<RequestBuilder, String> {
    if raw_headers.trim().is_empty() {
        return Ok(request);
    }

    let headers = serde_json::from_str::<HashMap<String, String>>(raw_headers)
        .map_err(|error| format!("图片上传 Headers JSON 无效: {error}"))?;

    for (key, value) in headers {
        let header_name = HeaderName::from_bytes(key.as_bytes())
            .map_err(|error| format!("图片上传 Header 名称无效: {error}"))?;
        let header_value = HeaderValue::from_str(&value)
            .map_err(|error| format!("图片上传 Header 值无效: {error}"))?;
        request = request.header(header_name, header_value);
    }

    Ok(request)
}

fn resolve_external_direct_url(
    response_body: &str,
    public_base: &str,
    fallback_name: &str,
) -> Result<String, String> {
    let trimmed = response_body.trim();

    if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
        if let Some(url) = find_first_string(
            &value,
            &["url", "public_url", "publicUrl", "direct_url", "directUrl"],
        ) {
            return join_public_url(public_base, &url);
        }

        if let Some(file_name) = find_first_string(
            &value,
            &["file_name", "fileName", "name", "path", "key", "relative_path"],
        ) {
            return join_public_url(public_base, &file_name);
        }
    }

    if !trimmed.is_empty() {
        return join_public_url(public_base, trimmed);
    }

    join_public_url(public_base, fallback_name)
}

fn find_first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value
            .get(*key)
            .and_then(Value::as_str)
            .map(|raw| raw.trim().to_string())
            .filter(|raw| !raw.is_empty())
    })
}

#[derive(Clone)]
struct WebdavImageConfig {
    address: String,
    username: String,
    password: String,
    path: String,
    public_base: String,
}

fn build_webdav_base_url(config: &WebdavImageConfig) -> Result<Url, String> {
    let mut base = normalize_http_url(&config.address).ok_or("WebDAV 地址无效".to_string())?;
    if !base.ends_with('/') {
        base.push('/');
    }
    let base_url = Url::parse(&base).map_err(|error| error.to_string())?;
    let mut path = config.path.trim().to_string();
    if path.starts_with('/') {
        path = path[1..].to_string();
    }
    let mut url = base_url;
    if !path.is_empty() {
        url = url
            .join(&format!("{}/", path.trim_end_matches('/')))
            .map_err(|error| error.to_string())?;
    }
    Ok(url)
}

async fn ensure_webdav_remote_dir(client: &Client, config: &WebdavImageConfig) -> Result<(), String> {
    let base = normalize_http_url(&config.address).ok_or("WebDAV 地址无效".to_string())?;
    let path = config.path.trim().trim_matches('/').to_string();
    if path.is_empty() {
        return Ok(());
    }

    let mut current = base.trim_end_matches('/').to_string();
    for part in path.split('/') {
        if part.is_empty() {
            continue;
        }

        current = format!("{current}/{part}");
        let url = Url::parse(&format!("{current}/")).map_err(|error| error.to_string())?;
        let response = client
            .request(
                Method::from_bytes(b"MKCOL").map_err(|error| error.to_string())?,
                url,
            )
            .basic_auth(&config.username, Some(&config.password))
            .send()
            .await
            .map_err(|error| error.to_string())?;

        if response.status().is_success()
            || response.status() == reqwest::StatusCode::METHOD_NOT_ALLOWED
        {
            continue;
        }

        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("创建 WebDAV 目录失败: {status} {body}"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn join_public_url_supports_absolute_and_relative_values() {
        assert_eq!(
            join_public_url("https://example.com/img", "foo/bar.png").unwrap(),
            "https://example.com/img/foo/bar.png"
        );
        assert_eq!(
            join_public_url("https://example.com/img", "https://cdn.example.com/a.png").unwrap(),
            "https://cdn.example.com/a.png"
        );
    }

    #[test]
    fn resolve_external_direct_url_supports_json_payloads() {
        let payload = r#"{"fileName":"nested/abc.png"}"#;
        assert_eq!(
            resolve_external_direct_url(payload, "https://example.com/img", "fallback.png").unwrap(),
            "https://example.com/img/nested/abc.png"
        );
    }
}
