use crate::models::error::HttpEngineError;
use crate::models::request::KeyValuePair;
use crate::models::response::{CookieData, ResponseData};

/// Maximum response body size we'll load into memory: 10MB.
const MAX_BODY_SIZE: u64 = 10 * 1024 * 1024;

/// Truncation threshold: bodies above this are truncated in the UI.
const TRUNCATE_THRESHOLD: usize = 1024 * 1024; // 1MB

/// Parse a reqwest::Response into our ResponseData struct.
pub async fn parse_response(
    response: reqwest::Response,
    elapsed_ms: u64,
) -> Result<ResponseData, HttpEngineError> {
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    // Collect headers
    let headers: Vec<KeyValuePair> = response
        .headers()
        .iter()
        .map(|(name, value)| {
            KeyValuePair::new(
                name.to_string(),
                value.to_str().unwrap_or("<binary>").to_string(),
                true,
            )
        })
        .collect();

    // Collect cookies
    let cookies: Vec<CookieData> = response
        .cookies()
        .map(|c| CookieData {
            name: c.name().to_string(),
            value: c.value().to_string(),
            domain: c.domain().map(|d| d.to_string()),
            path: c.path().map(|p| p.to_string()),
            expires: None, // reqwest cookie doesn't easily expose raw expires
            http_only: c.http_only(),
            secure: c.secure(),
        })
        .collect();

    // Check content-length before downloading
    if let Some(len) = response.content_length() {
        if len > MAX_BODY_SIZE {
            return Err(HttpEngineError::ResponseTooLarge(MAX_BODY_SIZE));
        }
    }

    // Read body with size limit
    let bytes = response
        .bytes()
        .await
        .map_err(|e| HttpEngineError::BodyDecodeError(e.to_string()))?;

    if bytes.len() as u64 > MAX_BODY_SIZE {
        return Err(HttpEngineError::ResponseTooLarge(MAX_BODY_SIZE));
    }

    let size_bytes = bytes.len() as u64;

    // Try to parse as UTF-8
    let (body, temp_path_str, truncated, full_size) = match String::from_utf8(bytes.to_vec()) {
        Ok(text) => {
            if bytes.len() > TRUNCATE_THRESHOLD {
                // Save full body to temp file
                let temp_path =
                    std::env::temp_dir().join(format!("apiark-response-{}", uuid::Uuid::new_v4()));

                if let Err(e) = std::fs::write(&temp_path, &bytes) {
                    tracing::warn!("Failed to write response temp file: {e}");
                }

                let truncated_bytes = &bytes[..TRUNCATE_THRESHOLD];
                let truncated_text = String::from_utf8(truncated_bytes.to_vec())
                    .unwrap_or_else(|_| format!("<binary data: {} bytes>", size_bytes));

                let temp_path_str = if temp_path.exists() {
                    Some(temp_path.to_string_lossy().to_string())
                } else {
                    None
                };

                (truncated_text, temp_path_str, Some(true), Some(size_bytes))
            } else {
                (text, None, None, None)
            }
        }
        Err(_) => {
            let temp_path = std::env::temp_dir()
                .join(format!("apiark-response-{}.bin", uuid::Uuid::new_v4()));
            if let Err(e) = std::fs::write(&temp_path, &bytes) {
                tracing::warn!("Failed to write binary response temp file: {e}");
            }
            let temp_path_str = if temp_path.exists() {
                Some(temp_path.to_string_lossy().to_string())
            } else {
                None
            };

            (
                format!("<binary data: {} bytes>", size_bytes),
                temp_path_str,
                None, // Not considered 'truncated' text, just non-displayable binary
                None,
            )
        }
    };

    Ok(ResponseData {
        status,
        status_text,
        headers,
        cookies,
        body,
        time_ms: elapsed_ms,
        size_bytes,
        truncated,
        full_size,
        temp_path: temp_path_str,
    })
}
