use keyring::Entry;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "EcoPaste.Transfer";
const ACCOUNT_NAME: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TransferCredentials {
    #[serde(default)]
    pub bark_url: String,
    #[serde(default)]
    pub bark_key: String,
    #[serde(default)]
    pub webhook_url: String,
    #[serde(default)]
    pub webhook_headers: String,
    #[serde(default)]
    pub receive_token: String,
    #[serde(default)]
    pub tunnel_address: String,
    #[serde(default)]
    pub image_webhook_upload_url: String,
    #[serde(default)]
    pub image_webhook_headers: String,
    #[serde(default)]
    pub image_webhook_public_base: String,
    #[serde(default)]
    pub image_webdav_url: String,
    #[serde(default)]
    pub image_webdav_path: String,
    #[serde(default)]
    pub image_webdav_username: String,
    #[serde(default)]
    pub image_webdav_password: String,
    #[serde(default)]
    pub image_webdav_public_base: String,
    #[serde(default)]
    pub image_local_public_base: String,
}

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|e| e.to_string())
}

pub fn save_credentials(config: &TransferCredentials) -> Result<(), String> {
    let value = serde_json::to_string(config).map_err(|e| e.to_string())?;
    let entry = entry()?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

pub fn load_credentials() -> Result<Option<TransferCredentials>, String> {
    let entry = entry()?;
    match entry.get_password() {
        Ok(value) => {
            let config =
                serde_json::from_str::<TransferCredentials>(&value).map_err(|e| e.to_string())?;
            Ok(Some(config))
        }
        Err(error) => {
            let msg = error.to_string();
            if msg.contains("NoEntry") || msg.contains("not found") {
                return Ok(None);
            }
            Ok(None)
        }
    }
}
