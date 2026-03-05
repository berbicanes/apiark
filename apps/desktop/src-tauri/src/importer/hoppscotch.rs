use std::collections::HashMap;

use serde_json::Value;

use super::{ImportBody, ImportData, ImportItem, ImportWarning};

/// Parse a Hoppscotch collection JSON string into ImportData.
pub fn parse_hoppscotch(content: &str) -> Result<ImportData, String> {
    let root: Value = serde_json::from_str(content).map_err(|e| format!("Invalid JSON: {e}"))?;

    // Hoppscotch collections have: v (version number), name, folders[], requests[]
    let collection_name = root
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Imported Hoppscotch Collection")
        .to_string();

    let mut warnings = Vec::new();

    let mut items = Vec::new();

    // Parse folders
    if let Some(folders) = root.get("folders").and_then(|v| v.as_array()) {
        for folder in folders {
            if let Some(item) = parse_folder(folder, &mut warnings) {
                items.push(item);
            }
        }
    }

    // Parse top-level requests
    if let Some(requests) = root.get("requests").and_then(|v| v.as_array()) {
        for req in requests {
            if let Some(item) = parse_request(req, &mut warnings) {
                items.push(item);
            }
        }
    }

    Ok(ImportData {
        collection_name,
        items,
        environments: Vec::new(),
        warnings,
    })
}

fn parse_folder(folder: &Value, warnings: &mut Vec<ImportWarning>) -> Option<ImportItem> {
    let name = folder
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Unnamed Folder")
        .to_string();

    let mut items = Vec::new();

    // Nested folders
    if let Some(folders) = folder.get("folders").and_then(|v| v.as_array()) {
        for f in folders {
            if let Some(item) = parse_folder(f, warnings) {
                items.push(item);
            }
        }
    }

    // Requests in folder
    if let Some(requests) = folder.get("requests").and_then(|v| v.as_array()) {
        for req in requests {
            if let Some(item) = parse_request(req, warnings) {
                items.push(item);
            }
        }
    }

    Some(ImportItem::Folder { name, items })
}

fn parse_request(req: &Value, warnings: &mut Vec<ImportWarning>) -> Option<ImportItem> {
    let name = req
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Unnamed Request")
        .to_string();

    let method = req
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_uppercase();

    let url = req
        .get("endpoint")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Parse headers
    let mut headers = HashMap::new();
    if let Some(header_arr) = req.get("headers").and_then(|v| v.as_array()) {
        for h in header_arr {
            let active = h.get("active").and_then(|v| v.as_bool()).unwrap_or(true);
            if !active {
                continue;
            }
            if let (Some(key), Some(value)) = (
                h.get("key").and_then(|v| v.as_str()),
                h.get("value").and_then(|v| v.as_str()),
            ) {
                if !key.is_empty() {
                    headers.insert(key.to_string(), value.to_string());
                }
            }
        }
    }

    // Parse body
    let body = parse_body(req);

    // Parse auth
    let auth = parse_auth(req, &name, warnings);

    Some(ImportItem::Request {
        name,
        method,
        url,
        headers,
        body: Box::new(body),
        auth: Box::new(auth),
        description: None,
        pre_request_script: req
            .get("preRequestScript")
            .and_then(|v| v.as_str())
            .map(String::from),
        post_response_script: req
            .get("testScript")
            .and_then(|v| v.as_str())
            .map(String::from),
        tests: None,
    })
}

fn parse_body(req: &Value) -> Option<ImportBody> {
    let body = req.get("body")?;

    // Hoppscotch body format: { contentType, body (string) }
    let content_type = body
        .get("contentType")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let raw_body = body.get("body").and_then(|v| v.as_str()).unwrap_or("");

    if raw_body.is_empty() {
        return None;
    }

    let body_type = if content_type.contains("json") {
        "json"
    } else if content_type.contains("xml") {
        "xml"
    } else if content_type.contains("form-urlencoded") {
        "urlencoded"
    } else if content_type.contains("multipart") {
        "form-data"
    } else {
        "raw"
    };

    Some(ImportBody {
        body_type: body_type.to_string(),
        content: raw_body.to_string(),
    })
}

fn parse_auth(
    req: &Value,
    _name: &str,
    _warnings: &mut Vec<ImportWarning>,
) -> Option<crate::models::auth::AuthConfig> {
    let auth = req.get("auth")?;
    let auth_type = auth.get("authType").and_then(|v| v.as_str())?;

    match auth_type {
        "bearer" => {
            let token = auth
                .get("token")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Some(crate::models::auth::AuthConfig::Bearer { token })
        }
        "basic" => {
            let username = auth
                .get("username")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let password = auth
                .get("password")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Some(crate::models::auth::AuthConfig::Basic { username, password })
        }
        _ => None,
    }
}
