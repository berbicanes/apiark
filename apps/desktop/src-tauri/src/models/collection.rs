use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::auth::AuthConfig;
use super::request::HttpMethod;

/// On-disk collection config (.apiark/apiark.yaml)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionConfig {
    pub name: String,
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub defaults: CollectionDefaults,
}

fn default_version() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionDefaults {
    pub auth: Option<AuthConfig>,
    #[serde(default = "default_true")]
    pub send_cookies: bool,
    #[serde(default = "default_true")]
    pub store_cookies: bool,
    #[serde(default)]
    pub persist_cookies: bool,
}

impl Default for CollectionDefaults {
    fn default() -> Self {
        Self {
            auth: None,
            send_cookies: true,
            store_cookies: true,
            persist_cookies: false,
        }
    }
}

fn default_true() -> bool {
    true
}

/// On-disk request file format (e.g. create-user.yaml)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestFile {
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    /// Protocol type: "http", "graphql", "websocket", "sse", "grpc"
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub protocol: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub headers: HashMap<String, String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth: Option<AuthConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub body: Option<RequestBodyFile>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub params: Option<HashMap<String, String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assert: Option<serde_yaml::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tests: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pre_request_script: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub post_response_script: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cookies: Option<HashMap<String, String>>,
}

/// Body stored in YAML files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBodyFile {
    #[serde(rename = "type")]
    pub body_type: String,
    #[serde(default)]
    pub content: String,
}

/// Optional folder config (_folder.yaml)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderConfig {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth: Option<AuthConfig>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub order: Vec<String>,
}

/// Lightweight metadata read from YAML without parsing full body/scripts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestMeta {
    pub name: String,
    pub method: HttpMethod,
    #[serde(default)]
    pub protocol: Option<String>,
    #[serde(default)]
    pub body: Option<RequestBodyFile>,
}

impl RequestMeta {
    /// Detect the protocol for this request.
    /// Uses the explicit `protocol` field if present, otherwise falls back
    /// to heuristic detection (GraphQL = POST with JSON body containing "query").
    pub fn detect_protocol(&self) -> Option<&str> {
        if let Some(ref p) = self.protocol {
            if p != "http" {
                return Some(p.as_str());
            }
        }
        // Legacy fallback: detect GraphQL from body
        if matches!(self.method, HttpMethod::POST) {
            if let Some(body) = &self.body {
                if body.body_type == "json" {
                    let is_gql = serde_json::from_str::<serde_json::Value>(&body.content)
                        .ok()
                        .and_then(|v| v.get("query").cloned())
                        .is_some();
                    if is_gql {
                        return Some("graphql");
                    }
                }
            }
        }
        None
    }

    /// Detect GraphQL: POST with a JSON body containing a "query" field.
    pub fn is_graphql(&self) -> bool {
        self.detect_protocol() == Some("graphql")
    }
}

/// Recursive tree node sent to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CollectionNode {
    Collection {
        name: String,
        path: String,
        children: Vec<CollectionNode>,
    },
    Folder {
        name: String,
        path: String,
        children: Vec<CollectionNode>,
    },
    Request {
        name: String,
        method: HttpMethod,
        path: String,
        #[serde(
            default,
            rename = "isGraphql",
            skip_serializing_if = "std::ops::Not::not"
        )]
        is_graphql: bool,
        /// Protocol: "graphql", "websocket", "sse", "grpc", or absent for HTTP
        #[serde(default, skip_serializing_if = "Option::is_none")]
        protocol: Option<String>,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_meta_detects_graphql() {
        let yaml = r#"
name: Test
method: POST
url: https://example.com/graphql
body:
  type: json
  content: '{"query": "{ users { id } }"}'
"#;
        let meta: RequestMeta = serde_yaml::from_str(yaml).unwrap();
        assert!(meta.is_graphql(), "should detect GraphQL from body");
    }

    #[test]
    fn test_request_meta_non_graphql() {
        let yaml = r#"
name: Test
method: POST
url: https://example.com/api
body:
  type: json
  content: '{"key": "value"}'
"#;
        let meta: RequestMeta = serde_yaml::from_str(yaml).unwrap();
        assert!(!meta.is_graphql(), "should not detect as GraphQL");
    }

    #[test]
    fn test_request_meta_detects_graphql_multiline() {
        let yaml = "name: Test\nmethod: POST\nurl: https://countries.trevorblades.com/graphql\nheaders:\n  Content-Type: application/json\nbody:\n  type: json\n  content: |-\n    {\n      \"query\": \"query { countries { name } }\"\n    }\n";
        let meta: RequestMeta = serde_yaml::from_str(yaml).unwrap();
        assert!(
            meta.is_graphql(),
            "should detect GraphQL with multiline body content"
        );
    }

    #[test]
    fn test_request_meta_get_not_graphql() {
        let yaml = r#"
name: Test
method: GET
url: https://example.com/api
"#;
        let meta: RequestMeta = serde_yaml::from_str(yaml).unwrap();
        assert!(!meta.is_graphql());
    }
}
