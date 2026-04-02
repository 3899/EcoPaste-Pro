use mime_guess::MimeGuess;
use nanoid::nanoid;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tokio::fs;
use tokio::time::sleep;

#[derive(Debug, Clone)]
pub struct PreparedTempImage {
    pub key: String,
    pub display_name: String,
    pub media_type: String,
    pub expires_at: Option<SystemTime>,
}

#[derive(Debug, Clone)]
pub struct ResolvedTempImage {
    pub bytes: Vec<u8>,
    pub display_name: String,
    pub media_type: String,
}

#[derive(Debug, Clone)]
struct TempImageEntry {
    file_path: PathBuf,
    display_name: String,
    media_type: String,
    expires_at: Option<SystemTime>,
}

#[derive(Debug)]
pub enum ResolveTempImageError {
    NotFound,
    Expired,
    Io(String),
}

pub struct TempImageManager {
    root_dir: PathBuf,
    entries: Mutex<HashMap<String, TempImageEntry>>,
}

impl TempImageManager {
    pub fn new() -> Self {
        let root_dir = std::env::temp_dir()
            .join("ecopaste")
            .join("objects");

        if root_dir.exists() {
            let _ = std::fs::remove_dir_all(&root_dir);
        }
        let _ = std::fs::create_dir_all(&root_dir);

        Self {
            root_dir,
            entries: Mutex::new(HashMap::new()),
        }
    }

    pub async fn prepare_from_path(
        self: &std::sync::Arc<Self>,
        source_path: &Path,
        display_name: Option<&str>,
        ttl_seconds: u64,
    ) -> Result<PreparedTempImage, String> {
        if !source_path.exists() {
            return Err(format!("图片文件不存在: {}", source_path.display()));
        }

        let metadata = std::fs::metadata(source_path).map_err(|e| e.to_string())?;
        if !metadata.is_file() {
            return Err(format!("图片路径不是文件: {}", source_path.display()));
        }

        fs::create_dir_all(&self.root_dir)
            .await
            .map_err(|e| format!("创建图片中转目录失败: {e}"))?;

        let media_type = infer_image_media_type(source_path)?;
        let key = nanoid!(24);
        let ext = source_path
            .extension()
            .and_then(OsStr::to_str)
            .filter(|value| !value.trim().is_empty())
            .map(|value| format!(".{value}"))
            .unwrap_or_default();
        let target_path = self.root_dir.join(format!("{key}{ext}"));

        if std::fs::hard_link(source_path, &target_path).is_err() {
            fs::copy(source_path, &target_path)
                .await
                .map_err(|e| format!("复制图片到临时目录失败: {e}"))?;
        }

        let display_name = display_name
            .filter(|value| !value.trim().is_empty())
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| {
                source_path
                    .file_name()
                    .map(|value| value.to_string_lossy().into_owned())
                    .unwrap_or_else(|| "image".to_string())
            });
        let expires_at = if ttl_seconds == 0 {
            None
        } else {
            Some(SystemTime::now() + Duration::from_secs(ttl_seconds))
        };

        if let Ok(mut entries) = self.entries.lock() {
            entries.insert(
                key.clone(),
                TempImageEntry {
                    file_path: target_path,
                    display_name: display_name.clone(),
                    media_type: media_type.clone(),
                    expires_at,
                },
            );
        } else {
            return Err("图片中转对象管理器状态异常".to_string());
        }

        if ttl_seconds > 0 {
            let manager = std::sync::Arc::clone(self);
            let key_for_cleanup = key.clone();
            tokio::spawn(async move {
                sleep(Duration::from_secs(ttl_seconds)).await;
                manager.remove_key(&key_for_cleanup).await;
            });
        }

        Ok(PreparedTempImage {
            key,
            display_name,
            media_type,
            expires_at,
        })
    }

    pub async fn resolve(&self, key: &str) -> Result<ResolvedTempImage, ResolveTempImageError> {
        let entry = match self.get_active_entry(key) {
            Ok(Some(entry)) => entry,
            Ok(None) => return Err(ResolveTempImageError::NotFound),
            Err(error) => return Err(error),
        };

        let bytes = fs::read(&entry.file_path)
            .await
            .map_err(|e| ResolveTempImageError::Io(e.to_string()))?;

        Ok(ResolvedTempImage {
            bytes,
            display_name: entry.display_name,
            media_type: entry.media_type,
        })
    }

    async fn remove_key(&self, key: &str) {
        let file_path = if let Ok(mut entries) = self.entries.lock() {
            if let Some(entry) = entries.get_mut(key) {
                entry.expires_at = Some(SystemTime::now() - Duration::from_secs(1));
                Some(entry.file_path.clone())
            } else {
                None
            }
        } else {
            None
        };

        if let Some(file_path) = file_path {
            let _ = fs::remove_file(file_path).await;
        }
    }

    fn get_active_entry(&self, key: &str) -> Result<Option<TempImageEntry>, ResolveTempImageError> {
        let mut entries = self
            .entries
            .lock()
            .map_err(|_| ResolveTempImageError::Io("图片中转对象管理器状态异常".to_string()))?;

        let Some(entry) = entries.get(key).cloned() else {
            return Ok(None);
        };

        if let Some(expires_at) = entry.expires_at {
            if SystemTime::now() >= expires_at {
                let expired = entries.remove(key);
                drop(entries);

                if let Some(expired) = expired {
                    let _ = std::fs::remove_file(expired.file_path);
                }

                return Err(ResolveTempImageError::Expired);
            }
        }

        Ok(Some(entry))
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn create_temp_image_file(name: &str) -> PathBuf {
        let path = std::env::temp_dir()
            .join(format!("ecopaste-test-{}-{name}", nanoid!(8)));
        std::fs::write(&path, b"fake-image-bytes").unwrap();
        path
    }

    #[tokio::test]
    async fn prepare_and_resolve_image_uses_opaque_key() {
        let source_path = create_temp_image_file("sample.png");
        let manager = std::sync::Arc::new(TempImageManager::new());

        let prepared = manager
            .prepare_from_path(&source_path, Some("original-name.png"), 60)
            .await
            .unwrap();

        assert_eq!(prepared.display_name, "original-name.png");
        assert_eq!(prepared.media_type, "image/png");
        assert!(!prepared.key.contains("original-name"));
        assert!(prepared.expires_at.is_some());

        let resolved = manager.resolve(&prepared.key).await.unwrap();
        assert_eq!(resolved.display_name, "original-name.png");
        assert_eq!(resolved.media_type, "image/png");
        assert_eq!(resolved.bytes, b"fake-image-bytes");

        let _ = std::fs::remove_file(source_path);
    }

    #[tokio::test]
    async fn resolve_returns_expired_after_ttl() {
        let source_path = create_temp_image_file("expires.jpg");
        let manager = std::sync::Arc::new(TempImageManager::new());

        let prepared = manager.prepare_from_path(&source_path, None, 1).await.unwrap();
        tokio::time::sleep(Duration::from_millis(1100)).await;

        let result = manager.resolve(&prepared.key).await;
        assert!(matches!(result, Err(ResolveTempImageError::Expired)));

        let _ = std::fs::remove_file(source_path);
    }
}
