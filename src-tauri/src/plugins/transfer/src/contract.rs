#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessedPayload {
    pub display_type: String,
    pub content: String,
    pub content_length: usize,
    pub display_source: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PreparedImagePayload {
    pub display_source: String,
    pub image_url: String,
    pub display_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OutboundPayload {
    Text(ProcessedPayload),
    Image(PreparedImagePayload),
}
