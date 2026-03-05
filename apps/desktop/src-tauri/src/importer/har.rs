use std::collections::HashMap;

use serde_json::Value;

use super::{ImportBody, ImportData, ImportItem, ImportWarning};

/// Static asset extensions to filter out
const STATIC_EXTENSIONS: &[&str] = &[
    ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf",
    ".eot", ".map", ".webp",
];

/// Parse a HAR (HTTP Archive) JSON string into ImportData.
pub fn parse_har(content: &str) -> Result<ImportData, String> {
    let root: Value = serde_json::from_str(content).map_err(|e| format!("Invalid JSON: {e}"))?;

    let log = root
        .get("log")
        .ok_or("Missing 'log' field — is this a valid HAR file?")?;

    let entries = log
        .get("entries")
        .and_then(|v| v.as_array())
        .ok_or("Missing 'log.entries' array")?;

    let mut warnings = Vec::new();
    let mut items = Vec::new();

    for (idx, entry) in entries.iter().enumerate() {
        let request = match entry.get("request") {
            Some(r) => r,
            None => continue,
        };

        let url = request
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // Filter out static assets
        let url_lower = url.to_lowercase();
        if STATIC_EXTENSIONS.iter().any(|ext| {
            url_lower
                .split('?')
                .next()
                .unwrap_or(&url_lower)
                .ends_with(ext)
        }) {
            continue;
        }

        let method = request
            .get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("GET")
            .to_uppercase();

        // Derive name from URL path
        let name = derive_request_name(&url, &method, idx);

        // Parse headers (skip pseudo-headers and common browser headers)
        let mut headers = HashMap::new();
        if let Some(header_arr) = request.get("headers").and_then(|v| v.as_array()) {
            for h in header_arr {
                if let (Some(key), Some(value)) = (
                    h.get("name").and_then(|v| v.as_str()),
                    h.get("value").and_then(|v| v.as_str()),
                ) {
                    let key_lower = key.to_lowercase();
                    // Skip browser-injected headers
                    if key_lower.starts_with(':')
                        || key_lower == "accept-encoding"
                        || key_lower == "accept-language"
                        || key_lower == "user-agent"
                        || key_lower == "cookie"
                        || key_lower == "connection"
                        || key_lower == "host"
                        || key_lower == "sec-ch-ua"
                        || key_lower.starts_with("sec-fetch")
                    {
                        continue;
                    }
                    headers.insert(key.to_string(), value.to_string());
                }
            }
        }

        // Parse body
        let body = parse_post_data(request);

        items.push(ImportItem::Request {
            name,
            method,
            url,
            headers,
            body: Box::new(body),
            auth: Box::new(None),
            description: None,
            pre_request_script: None,
            post_response_script: None,
            tests: None,
        });
    }

    if items.is_empty() {
        warnings.push(ImportWarning {
            item_name: "HAR Import".to_string(),
            message: "No API requests found after filtering static assets".to_string(),
        });
    }

    Ok(ImportData {
        collection_name: "HAR Import".to_string(),
        items,
        environments: Vec::new(),
        warnings,
    })
}

fn derive_request_name(url: &str, method: &str, index: usize) -> String {
    // Try to extract a meaningful name from URL path
    if let Ok(parsed) = url::Url::parse(url) {
        let path = parsed.path();
        let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        if !segments.is_empty() {
            let last_segments: Vec<&str> = segments.iter().rev().take(2).copied().collect();
            let name_part = last_segments
                .into_iter()
                .rev()
                .collect::<Vec<_>>()
                .join("/");
            return format!("{method} {name_part}");
        }
    }
    format!("Request {}", index + 1)
}

fn parse_post_data(request: &Value) -> Option<ImportBody> {
    let post_data = request.get("postData")?;

    let mime_type = post_data
        .get("mimeType")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let text = post_data.get("text").and_then(|v| v.as_str()).unwrap_or("");

    if text.is_empty() {
        return None;
    }

    let body_type = if mime_type.contains("json") {
        "json"
    } else if mime_type.contains("xml") {
        "xml"
    } else if mime_type.contains("form-urlencoded") {
        "urlencoded"
    } else if mime_type.contains("multipart") {
        "form-data"
    } else {
        "raw"
    };

    Some(ImportBody {
        body_type: body_type.to_string(),
        content: text.to_string(),
    })
}
