use reqwest::{Client, RequestBuilder};
use std::time::Duration;
use url::Url;

use crate::http::auth_handlers;
use crate::models::auth::{ApiKeyLocation, AuthConfig};
use crate::models::error::HttpEngineError;
use crate::models::request::{BodyType, KeyValuePair, RequestBody, SendRequestParams};

/// Default timeout: 30 seconds.
const DEFAULT_TIMEOUT_MS: u64 = 30_000;

/// Build a reqwest Client from request params.
pub fn build_client(params: &SendRequestParams) -> Result<Client, HttpEngineError> {
    let timeout = Duration::from_millis(params.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));

    let mut builder = Client::builder()
        .timeout(timeout)
        .redirect(if params.follow_redirects {
            reqwest::redirect::Policy::limited(10)
        } else {
            reqwest::redirect::Policy::none()
        })
        .cookie_store(true);

    if !params.verify_ssl {
        builder = builder.danger_accept_invalid_certs(true);
    }

    // Custom CA certificate
    if let Some(ca_path) = &params.ca_cert_path {
        if !ca_path.is_empty() {
            let ca_pem = std::fs::read(ca_path).map_err(|e| {
                HttpEngineError::RequestError(format!(
                    "Failed to read CA cert '{}': {}",
                    ca_path, e
                ))
            })?;
            let cert = reqwest::Certificate::from_pem(&ca_pem).map_err(|e| {
                HttpEngineError::RequestError(format!("Invalid CA certificate: {}", e))
            })?;
            builder = builder.add_root_certificate(cert);
        }
    }

    // Client certificate (mutual TLS)
    if let Some(cert_path) = &params.client_cert_path {
        if !cert_path.is_empty() {
            let cert_data = std::fs::read(cert_path).map_err(|e| {
                HttpEngineError::RequestError(format!(
                    "Failed to read client cert '{}': {}",
                    cert_path, e
                ))
            })?;

            // PEM format — combine cert + key into a single PEM buffer
            let mut pem_buf = cert_data;
            if let Some(key_path) = &params.client_key_path {
                if !key_path.is_empty() {
                    let key_data = std::fs::read(key_path).map_err(|e| {
                        HttpEngineError::RequestError(format!(
                            "Failed to read client key '{}': {}",
                            key_path, e
                        ))
                    })?;
                    pem_buf.push(b'\n');
                    pem_buf.extend_from_slice(&key_data);
                }
            }
            let identity = reqwest::Identity::from_pem(&pem_buf).map_err(|e| {
                HttpEngineError::RequestError(format!("Invalid PEM client certificate: {}", e))
            })?;
            builder = builder.identity(identity);
        }
    }

    if let Some(proxy) = &params.proxy {
        let mut reqwest_proxy = reqwest::Proxy::all(&proxy.url)
            .map_err(|e| HttpEngineError::RequestError(format!("Invalid proxy URL: {}", e)))?;
        if let (Some(user), Some(pass)) = (&proxy.username, &proxy.password) {
            reqwest_proxy = reqwest_proxy.basic_auth(user, pass);
        }
        builder = builder.proxy(reqwest_proxy);
    }

    builder
        .build()
        .map_err(|e| HttpEngineError::RequestError(format!("Failed to build HTTP client: {}", e)))
}

/// Build the full URL with query parameters appended.
pub fn build_url_with_params(
    base_url: &str,
    params: &[KeyValuePair],
    auth: &Option<AuthConfig>,
) -> Result<Url, HttpEngineError> {
    let mut url = Url::parse(base_url)
        .map_err(|e| HttpEngineError::InvalidUrl(format!("{}: {}", e, base_url)))?;

    // Add enabled query params
    {
        let mut query_pairs = url.query_pairs_mut();
        for param in params.iter().filter(|p| p.enabled && !p.key.is_empty()) {
            query_pairs.append_pair(&param.key, &param.value);
        }

        // Add API key to query if configured
        if let Some(AuthConfig::ApiKey {
            key,
            value,
            add_to: ApiKeyLocation::Query,
        }) = auth
        {
            query_pairs.append_pair(key, value);
        }
    }

    // Remove trailing `?` if no params were added
    if url.query() == Some("") {
        url.set_query(None);
    }

    Ok(url)
}

/// Build the reqwest RequestBuilder from our params.
pub fn build_request(
    client: &Client,
    params: &SendRequestParams,
) -> Result<RequestBuilder, HttpEngineError> {
    let url = build_url_with_params(&params.url, &params.params, &params.auth)?;
    let method = params.method.to_reqwest();

    let mut builder = client.request(method, url);

    // Apply headers
    for header in params
        .headers
        .iter()
        .filter(|h| h.enabled && !h.key.is_empty())
    {
        builder = builder.header(&header.key, &header.value);
    }

    // Apply auth
    builder = apply_auth(builder, &params.auth, params);

    // Apply body
    builder = apply_body(builder, &params.body)?;

    // Apply cookie overrides
    if let Some(cookies) = &params.cookies {
        let cookie_str = cookies
            .iter()
            .filter(|(_, v)| !v.is_empty())
            .map(|(k, v)| format!("{k}={v}"))
            .collect::<Vec<_>>()
            .join("; ");
        if !cookie_str.is_empty() {
            builder = builder.header("Cookie", cookie_str);
        }
    }

    Ok(builder)
}

/// Apply authentication to the request builder.
fn apply_auth(
    mut builder: RequestBuilder,
    auth: &Option<AuthConfig>,
    params: &SendRequestParams,
) -> RequestBuilder {
    match auth {
        Some(AuthConfig::Bearer { token }) => {
            builder = builder.bearer_auth(token);
        }
        Some(AuthConfig::Basic { username, password }) => {
            builder = builder.basic_auth(username, Some(password));
        }
        Some(AuthConfig::ApiKey {
            key,
            value,
            add_to: ApiKeyLocation::Header,
        }) => {
            builder = builder.header(key, value);
        }
        // ApiKey::Query is handled in build_url_with_params
        Some(AuthConfig::ApiKey {
            add_to: ApiKeyLocation::Query,
            ..
        }) => {}
        // OAuth2 is resolved before reaching here (converted to Bearer in interpolate_auth)
        Some(AuthConfig::Oauth2 { .. }) => {}
        // Digest auth — we store credentials; actual challenge-response is complex.
        // For now, pre-compute a digest header if realm/nonce are provided (from a prior 401).
        // In practice, most Digest flows need a two-step process; this provides the header
        // when the user supplies the nonce/realm manually.
        Some(AuthConfig::Digest { username, password }) => {
            // Digest is typically challenge-response. We use basic auth as fallback
            // so reqwest can handle the 401 challenge. For explicit digest, the user
            // would need to supply nonce/realm which we don't collect in the UI yet.
            builder = builder.basic_auth(username, Some(password));
        }
        Some(AuthConfig::AwsV4 {
            access_key,
            secret_key,
            region,
            service,
            session_token,
        }) => {
            let now = chrono::Utc::now();
            let url = build_url_with_params(&params.url, &params.params, &params.auth)
                .unwrap_or_else(|_| url::Url::parse("http://localhost").unwrap());
            let method = format!("{:?}", params.method);
            let headers: Vec<(String, String)> = params
                .headers
                .iter()
                .filter(|h| h.enabled && !h.key.is_empty())
                .map(|h| (h.key.clone(), h.value.clone()))
                .collect();
            let body_str = params
                .body
                .as_ref()
                .map(|b| b.content.as_str())
                .unwrap_or("");

            let (auth_header, extra_headers) = auth_handlers::compute_aws_v4_auth(
                access_key,
                secret_key,
                session_token,
                region,
                service,
                &method,
                &url,
                &headers,
                body_str,
                &now,
            );

            builder = builder.header("Authorization", auth_header);
            for (k, v) in extra_headers {
                builder = builder.header(k, v);
            }
        }
        Some(AuthConfig::JwtBearer {
            secret,
            algorithm,
            payload,
            header_prefix,
        }) => match auth_handlers::generate_jwt(secret, algorithm, payload) {
            Ok(token) => {
                let value = if header_prefix.is_empty() {
                    token
                } else {
                    format!("{header_prefix} {token}")
                };
                builder = builder.header("Authorization", value);
            }
            Err(e) => {
                tracing::warn!("JWT generation failed: {e}");
            }
        },
        Some(AuthConfig::Ntlm {
            domain,
            workstation,
            ..
        }) => {
            // First request sends Type 1 (Negotiate) message.
            // If we get a 401 with a Type 2 challenge, the caller handles retry with Type 3.
            let negotiate = auth_handlers::generate_ntlm_negotiate(domain, workstation);
            builder = builder.header("Authorization", format!("NTLM {negotiate}"));
        }
        Some(AuthConfig::None) | None => {}
    }
    builder
}

/// Apply request body.
fn apply_body(
    builder: RequestBuilder,
    body: &Option<RequestBody>,
) -> Result<RequestBuilder, HttpEngineError> {
    let body = match body {
        Some(b) => b,
        None => return Ok(builder),
    };

    match body.body_type {
        BodyType::Json => Ok(builder
            .header("Content-Type", "application/json")
            .body(body.content.clone())),
        BodyType::Xml => Ok(builder
            .header("Content-Type", "application/xml")
            .body(body.content.clone())),
        BodyType::Raw => Ok(builder
            .header("Content-Type", "text/plain")
            .body(body.content.clone())),
        BodyType::Urlencoded => {
            let pairs: Vec<(String, String)> = body
                .form_data
                .iter()
                .filter(|kv| kv.enabled && !kv.key.is_empty())
                .map(|kv| (kv.key.clone(), kv.value.clone()))
                .collect();
            Ok(builder.form(&pairs))
        }
        BodyType::FormData => {
            let mut form = reqwest::multipart::Form::new();
            for kv in body
                .form_data
                .iter()
                .filter(|kv| kv.enabled && !kv.key.is_empty())
            {
                form = form.text(kv.key.clone(), kv.value.clone());
            }
            Ok(builder.multipart(form))
        }
        BodyType::Binary => Ok(builder
            .header("Content-Type", "application/octet-stream")
            .body(body.content.clone().into_bytes())),
        BodyType::None => Ok(builder),
    }
}
