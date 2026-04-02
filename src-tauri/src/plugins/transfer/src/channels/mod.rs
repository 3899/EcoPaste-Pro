pub mod bark;
pub mod webhook;

use reqwest::Client;

use self::bark::BarkChannel;
use self::webhook::WebhookChannel;
use crate::contract::OutboundPayload;
use crate::credentials::TransferCredentials;
use crate::push_provider::{PushOptions, PushResult};

pub enum PushChannel {
    Bark(BarkChannel),
    Webhook(WebhookChannel),
}

impl PushChannel {
    pub fn from_provider(
        provider: &str,
        client: &Client,
        creds: &TransferCredentials,
        opts: &PushOptions,
        group_key: Option<String>,
    ) -> Result<Self, String> {
        match provider {
            "bark" => Ok(Self::Bark(BarkChannel::new(
                client.clone(),
                creds.clone(),
                opts.clone(),
                group_key,
            ))),
            "webhook" => Ok(Self::Webhook(WebhookChannel::new(
                client.clone(),
                creds.clone(),
                opts.clone(),
            ))),
            other => Err(format!("未知推送通道: {other}")),
        }
    }

    pub async fn send(&self, payload: &OutboundPayload) -> PushResult {
        match self {
            Self::Bark(channel) => channel.send(payload).await,
            Self::Webhook(channel) => channel.send(payload).await,
        }
    }
}
