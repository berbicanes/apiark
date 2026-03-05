use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedCurlRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub auth_basic: Option<(String, String)>,
    pub verify_ssl: bool,
    pub follow_redirects: bool,
}

/// Parse a cURL command string into structured request data.
pub fn parse_curl(input: &str) -> Result<ParsedCurlRequest, String> {
    let tokens = tokenize(input)?;

    let mut method = None;
    let mut url = None;
    let mut headers: HashMap<String, String> = HashMap::new();
    let mut data: Option<String> = None;
    let mut auth_basic: Option<(String, String)> = None;
    let mut verify_ssl = true;
    let mut follow_redirects = false;

    let mut i = 0;
    while i < tokens.len() {
        let token = &tokens[i];
        match token.as_str() {
            "curl" => {}
            "-X" | "--request" => {
                i += 1;
                method = tokens.get(i).cloned();
            }
            "-H" | "--header" => {
                i += 1;
                if let Some(header) = tokens.get(i) {
                    if let Some((key, value)) = header.split_once(':') {
                        headers.insert(key.trim().to_string(), value.trim().to_string());
                    }
                }
            }
            "-d" | "--data" | "--data-raw" | "--data-binary" => {
                i += 1;
                data = tokens.get(i).cloned();
            }
            "-u" | "--user" => {
                i += 1;
                if let Some(creds) = tokens.get(i) {
                    let parts: Vec<&str> = creds.splitn(2, ':').collect();
                    auth_basic = Some((
                        parts[0].to_string(),
                        parts.get(1).unwrap_or(&"").to_string(),
                    ));
                }
            }
            "-k" | "--insecure" => {
                verify_ssl = false;
            }
            "-L" | "--location" => {
                follow_redirects = true;
            }
            "--compressed" | "-s" | "--silent" | "-S" | "--show-error" | "-v" | "--verbose" => {
                // Ignored flags
            }
            _ => {
                // If it starts with -, it's an unknown flag; skip its value if needed
                if token.starts_with('-') {
                    // Unknown flag, skip
                } else if url.is_none() {
                    // First non-flag token after 'curl' is the URL
                    url = Some(token.clone());
                }
            }
        }
        i += 1;
    }

    let url = url.ok_or("No URL found in cURL command")?;

    // Infer method from data presence
    let method = method.unwrap_or_else(|| {
        if data.is_some() {
            "POST".to_string()
        } else {
            "GET".to_string()
        }
    });

    // Infer body type from content-type header
    let content_type = headers
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("content-type"))
        .map(|(_, v)| v.clone());

    let body_type = content_type.as_deref().map(|ct| {
        if ct.contains("application/json") {
            "json"
        } else if ct.contains("application/xml") || ct.contains("text/xml") {
            "xml"
        } else if ct.contains("application/x-www-form-urlencoded") {
            "urlencoded"
        } else if ct.contains("multipart/form-data") {
            "form-data"
        } else {
            "raw"
        }
        .to_string()
    });

    Ok(ParsedCurlRequest {
        method: method.to_uppercase(),
        url,
        headers,
        body: data,
        body_type,
        auth_basic,
        verify_ssl,
        follow_redirects,
    })
}

/// Export request parameters to a cURL command string.
pub fn export_curl(
    method: &str,
    url: &str,
    headers: &HashMap<String, String>,
    body: Option<&str>,
    auth_basic: Option<(&str, &str)>,
) -> String {
    let mut parts = vec![format!("curl -X {method}")];

    parts.push(format!("'{url}'"));

    for (key, value) in headers {
        parts.push(format!("-H '{key}: {value}'"));
    }

    if let Some(body) = body {
        let escaped = body.replace('\'', "'\\''");
        parts.push(format!("-d '{escaped}'"));
    }

    if let Some((user, pass)) = auth_basic {
        parts.push(format!("-u '{user}:{pass}'"));
    }

    parts.join(" \\\n  ")
}

/// Tokenize a cURL command, handling single and double quotes.
fn tokenize(input: &str) -> Result<Vec<String>, String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let chars = input.chars().peekable();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut escape_next = false;

    for ch in chars {
        if escape_next {
            current.push(ch);
            escape_next = false;
            continue;
        }

        match ch {
            '\\' if !in_single_quote => {
                escape_next = true;
            }
            '\'' if !in_double_quote => {
                in_single_quote = !in_single_quote;
            }
            '"' if !in_single_quote => {
                in_double_quote = !in_double_quote;
            }
            ' ' | '\t' | '\n' | '\r' if !in_single_quote && !in_double_quote => {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            }
            _ => {
                current.push(ch);
            }
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    if in_single_quote || in_double_quote {
        return Err("Unterminated quote in cURL command".to_string());
    }

    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_get() {
        let result = parse_curl("curl https://api.example.com/users").unwrap();
        assert_eq!(result.method, "GET");
        assert_eq!(result.url, "https://api.example.com/users");
    }

    #[test]
    fn test_post_with_data() {
        let result = parse_curl(
            r#"curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{"name": "test"}'"#,
        )
        .unwrap();
        assert_eq!(result.method, "POST");
        assert_eq!(result.body.as_deref(), Some(r#"{"name": "test"}"#));
        assert_eq!(result.body_type.as_deref(), Some("json"));
    }

    #[test]
    fn test_basic_auth() {
        let result = parse_curl("curl -u user:pass https://example.com").unwrap();
        assert_eq!(
            result.auth_basic,
            Some(("user".to_string(), "pass".to_string()))
        );
    }

    #[test]
    fn test_insecure_flag() {
        let result = parse_curl("curl -k https://example.com").unwrap();
        assert!(!result.verify_ssl);
    }
}
