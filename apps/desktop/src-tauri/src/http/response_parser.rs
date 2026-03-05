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
        .map(|(name, value)| KeyValuePair {
            key: name.to_string(),
            value: value.to_str().unwrap_or("<binary>").to_string(),
            enabled: true,
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

    // Check if we need to truncate
    if bytes.len() > TRUNCATE_THRESHOLD {
        // Save full body to temp file
        let temp_path =
            std::env::temp_dir().join(format!("apiark-response-{}", uuid::Uuid::new_v4()));

        if let Err(e) = std::fs::write(&temp_path, &bytes) {
            tracing::warn!("Failed to write response temp file: {e}");
            // Fall through to return truncated body without temp path
        }

        let truncated_bytes = &bytes[..TRUNCATE_THRESHOLD];
        let body = String::from_utf8(truncated_bytes.to_vec())
            .unwrap_or_else(|_| format!("<binary data: {} bytes>", size_bytes));

        let temp_path_str = if temp_path.exists() {
            Some(temp_path.to_string_lossy().to_string())
        } else {
            None
        };

        return Ok(ResponseData {
            status,
            status_text,
            headers,
            cookies,
            body,
            time_ms: elapsed_ms,
            size_bytes,
            truncated: Some(true),
            full_size: Some(size_bytes),
            temp_path: temp_path_str,
        });
    }

    let body = String::from_utf8(bytes.to_vec()).unwrap_or_else(|_| {
        // For binary responses, show a placeholder
        format!("<binary data: {} bytes>", size_bytes)
    });

    Ok(ResponseData {
        status,
        status_text,
        headers,
        cookies,
        body,
        time_ms: elapsed_ms,
        size_bytes,
        truncated: None,
        full_size: None,
        temp_path: None,
    })
}
