use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── HTTP Method ──

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "UPPERCASE")]
#[allow(clippy::upper_case_acronyms)]
pub enum HttpMethod {
    #[default]
    GET,
    POST,
    PUT,
    PATCH,
    DELETE,
    HEAD,
    OPTIONS,
}

impl HttpMethod {
    pub fn to_reqwest(&self) -> reqwest::Method {
        match self {
            HttpMethod::GET => reqwest::Method::GET,
            HttpMethod::POST => reqwest::Method::POST,
            HttpMethod::PUT => reqwest::Method::PUT,
            HttpMethod::PATCH => reqwest::Method::PATCH,
            HttpMethod::DELETE => reqwest::Method::DELETE,
            HttpMethod::HEAD => reqwest::Method::HEAD,
            HttpMethod::OPTIONS => reqwest::Method::OPTIONS,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            HttpMethod::GET => "GET",
            HttpMethod::POST => "POST",
            HttpMethod::PUT => "PUT",
            HttpMethod::PATCH => "PATCH",
            HttpMethod::DELETE => "DELETE",
            HttpMethod::HEAD => "HEAD",
            HttpMethod::OPTIONS => "OPTIONS",
        }
    }
}

// ── Body Type ──

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
#[allow(dead_code)]
pub enum BodyType {
    Json,
    Xml,
    FormData,
    Urlencoded,
    Raw,
    Binary,
    #[default]
    None,
}

// ── Auth Config ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum AuthConfig {
    None,
    Bearer {
        token: String,
    },
    Basic {
        username: String,
        password: String,
    },
    ApiKey {
        key: String,
        value: String,
        #[serde(default = "default_header", rename = "addTo")]
        add_to: ApiKeyLocation,
    },
    Oauth2 {
        #[serde(default, rename = "clientId")]
        client_id: String,
        #[serde(default, rename = "authUrl")]
        auth_url: String,
        #[serde(default)]
        token: String,
    },
    Digest {
        username: String,
        password: String,
    },
    #[serde(rename = "aws-v4")]
    AwsV4 {
        #[serde(rename = "accessKey")]
        access_key: String,
        #[serde(rename = "secretKey")]
        secret_key: String,
        #[serde(default)]
        region: String,
        #[serde(default)]
        service: String,
        #[serde(default, rename = "sessionToken")]
        session_token: String,
    },
    #[serde(rename = "jwt-bearer")]
    JwtBearer {
        secret: String,
        #[serde(default = "default_hs256")]
        algorithm: String,
        #[serde(default)]
        payload: String,
        #[serde(default = "default_bearer_prefix", rename = "headerPrefix")]
        header_prefix: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ApiKeyLocation {
    #[default]
    Header,
    Query,
}

fn default_header() -> ApiKeyLocation {
    ApiKeyLocation::Header
}

fn default_hs256() -> String {
    "HS256".to_string()
}

fn default_bearer_prefix() -> String {
    "Bearer".to_string()
}

// ── Collection File Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionConfig {
    pub name: String,
    #[serde(default = "default_version")]
    pub version: u32,
}

fn default_version() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestFile {
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub auth: Option<AuthConfig>,
    #[serde(default)]
    pub body: Option<RequestBodyFile>,
    #[serde(default)]
    pub params: Option<HashMap<String, String>>,
    #[serde(default)]
    pub assert: Option<serde_yaml::Value>,
    #[serde(default)]
    pub tests: Option<String>,
    #[serde(default)]
    pub pre_request_script: Option<String>,
    #[serde(default)]
    pub post_response_script: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBodyFile {
    #[serde(rename = "type")]
    pub body_type: String,
    #[serde(default)]
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentFile {
    pub name: String,
    #[serde(default)]
    pub variables: HashMap<String, String>,
    #[serde(default)]
    pub secrets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderConfig {
    #[serde(default)]
    pub order: Vec<String>,
}

// ── Runner Result Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestRunResult {
    pub name: String,
    pub method: String,
    pub url: String,
    pub status: Option<u16>,
    pub time_ms: Option<u64>,
    pub passed: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IterationResult {
    pub iteration: u32,
    pub results: Vec<RequestRunResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunSummary {
    pub total_requests: usize,
    pub total_passed: usize,
    pub total_failed: usize,
    pub total_time_ms: u64,
    pub iterations: Vec<IterationResult>,
}
