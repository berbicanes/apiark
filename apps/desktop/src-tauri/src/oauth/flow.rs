use crate::models::auth::{AuthConfig, OAuth2GrantType};
use crate::oauth::callback::start_callback_server;
use crate::oauth::{OAuthToken, OAuthTokenStore};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// Execute an OAuth 2.0 flow and return the access token.
pub async fn execute_oauth_flow(
    auth: &AuthConfig,
    store: &OAuthTokenStore,
    open_browser: impl Fn(&str) -> Result<(), String>,
) -> Result<String, String> {
    let (
        grant_type,
        auth_url,
        token_url,
        client_id,
        client_secret,
        scope,
        callback_url,
        username,
        password,
        use_pkce,
    ) = match auth {
        AuthConfig::Oauth2 {
            grant_type,
            auth_url,
            token_url,
            client_id,
            client_secret,
            scope,
            callback_url,
            username,
            password,
            use_pkce,
        } => (
            grant_type,
            auth_url,
            token_url,
            client_id,
            client_secret,
            scope,
            callback_url,
            username,
            password,
            use_pkce,
        ),
        _ => return Err("Not an OAuth2 auth config".to_string()),
    };

    let cache_key = OAuthTokenStore::cache_key(client_id, auth_url);

    // Check if we have a cached, non-expired token
    if let Some(token) = store.get(&cache_key) {
        if !token.is_expired() {
            return Ok(token.access_token.clone());
        }
        // Try refresh if we have a refresh token
        if let Some(ref refresh_token) = token.refresh_token {
            match refresh_token_flow(token_url, client_id, client_secret, refresh_token).await {
                Ok(new_token) => {
                    let access = new_token.access_token.clone();
                    store.set(cache_key, new_token);
                    return Ok(access);
                }
                Err(e) => {
                    tracing::warn!("Token refresh failed, re-authenticating: {e}");
                    store.remove(&cache_key);
                }
            }
        }
    }

    let token = match grant_type {
        OAuth2GrantType::ClientCredentials => {
            client_credentials_flow(token_url, client_id, client_secret, scope).await?
        }
        OAuth2GrantType::Password => {
            password_flow(
                token_url,
                client_id,
                client_secret,
                scope,
                username,
                password,
            )
            .await?
        }
        OAuth2GrantType::AuthorizationCode => {
            auth_code_flow(
                auth_url,
                token_url,
                client_id,
                client_secret,
                scope,
                callback_url,
                *use_pkce,
                &open_browser,
            )
            .await?
        }
        OAuth2GrantType::Implicit => {
            implicit_flow(auth_url, client_id, scope, callback_url, &open_browser).await?
        }
    };

    let access = token.access_token.clone();
    store.set(cache_key, token);
    Ok(access)
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    token_type: Option<String>,
    #[serde(default, deserialize_with = "deserialize_expires_in")]
    expires_in: Option<u64>,
    refresh_token: Option<String>,
}

/// Some providers return expires_in as a string ("3600") instead of a number.
fn deserialize_expires_in<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de;

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum ExpiresIn {
        Num(u64),
        Str(String),
        Null,
    }

    match ExpiresIn::deserialize(deserializer) {
        Ok(ExpiresIn::Num(n)) => Ok(Some(n)),
        Ok(ExpiresIn::Str(s)) => Ok(s.parse().ok()),
        Ok(ExpiresIn::Null) | Err(_) => Ok(None),
    }
}

fn token_from_response(resp: TokenResponse) -> OAuthToken {
    let expires_at = resp
        .expires_in
        .map(|secs| chrono::Utc::now().timestamp() + secs as i64);
    OAuthToken {
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
        expires_at,
        token_type: resp.token_type.unwrap_or_else(|| "Bearer".to_string()),
    }
}

// ── Client Credentials ──

async fn client_credentials_flow(
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    scope: &str,
) -> Result<OAuthToken, String> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("grant_type", "client_credentials");
    params.insert("client_id", client_id);
    params.insert("client_secret", client_secret);
    if !scope.is_empty() {
        params.insert("scope", scope);
    }

    let resp = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token endpoint returned {status}: {body}"));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read token response body: {e}"))?;

    let token_resp: TokenResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse token response: {e}\nBody: {body}"))?;

    Ok(token_from_response(token_resp))
}

// ── Password Grant ──

async fn password_flow(
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    scope: &str,
    username: &str,
    password: &str,
) -> Result<OAuthToken, String> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("grant_type", "password");
    params.insert("username", username);
    params.insert("password", password);
    if !scope.is_empty() {
        params.insert("scope", scope);
    }

    let mut req = client.post(token_url).form(&params);
    if !client_id.is_empty() {
        req = req.basic_auth(client_id, Some(client_secret));
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Token request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token endpoint returned {status}: {body}"));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read token response body: {e}"))?;

    let token_resp: TokenResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse token response: {e}\nBody: {body}"))?;

    Ok(token_from_response(token_resp))
}

// ── Authorization Code (+ optional PKCE) ──

#[allow(clippy::too_many_arguments)]
async fn auth_code_flow(
    auth_url: &str,
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    scope: &str,
    callback_url: &str,
    use_pkce: bool,
    open_browser: &impl Fn(&str) -> Result<(), String>,
) -> Result<OAuthToken, String> {
    let port = extract_port(callback_url)?;
    let state = uuid::Uuid::new_v4().to_string();

    // PKCE challenge
    let (code_verifier, code_challenge) = if use_pkce {
        let verifier = generate_code_verifier();
        let challenge = generate_code_challenge(&verifier);
        (Some(verifier), Some(challenge))
    } else {
        (None, None)
    };

    // Start callback server
    let (shutdown_tx, result_rx) = start_callback_server(port).await?;

    // Build authorization URL
    let mut auth_params = vec![
        ("response_type", "code".to_string()),
        ("client_id", client_id.to_string()),
        ("redirect_uri", callback_url.to_string()),
        ("state", state.clone()),
    ];
    if !scope.is_empty() {
        auth_params.push(("scope", scope.to_string()));
    }
    if let Some(ref challenge) = code_challenge {
        auth_params.push(("code_challenge", challenge.clone()));
        auth_params.push(("code_challenge_method", "S256".to_string()));
    }

    let auth_url_full = format!(
        "{}?{}",
        auth_url,
        auth_params
            .iter()
            .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
            .collect::<Vec<_>>()
            .join("&")
    );

    // Open browser
    open_browser(&auth_url_full)?;

    // Wait for callback
    let callback_result = result_rx
        .await
        .map_err(|_| "Authorization timed out or was cancelled".to_string())?;

    // Shut down the callback server
    let _ = shutdown_tx.send(());

    // Verify state
    if callback_result.state.as_deref() != Some(&state) {
        return Err("OAuth state mismatch — possible CSRF attack".to_string());
    }

    let code = callback_result
        .code
        .ok_or("No authorization code received")?;

    // Exchange code for token
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("grant_type", "authorization_code".to_string());
    params.insert("code", code);
    params.insert("redirect_uri", callback_url.to_string());
    params.insert("client_id", client_id.to_string());
    if !client_secret.is_empty() {
        params.insert("client_secret", client_secret.to_string());
    }
    if let Some(verifier) = code_verifier {
        params.insert("code_verifier", verifier);
    }

    let resp = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token endpoint returned {status}: {body}"));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read token response body: {e}"))?;

    let token_resp: TokenResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse token response: {e}\nBody: {body}"))?;

    Ok(token_from_response(token_resp))
}

// ── Implicit Flow ──

async fn implicit_flow(
    auth_url: &str,
    client_id: &str,
    scope: &str,
    callback_url: &str,
    open_browser: &impl Fn(&str) -> Result<(), String>,
) -> Result<OAuthToken, String> {
    let port = extract_port(callback_url)?;
    let state = uuid::Uuid::new_v4().to_string();

    let (shutdown_tx, result_rx) = start_callback_server(port).await?;

    let mut auth_params = vec![
        ("response_type", "token".to_string()),
        ("client_id", client_id.to_string()),
        ("redirect_uri", callback_url.to_string()),
        ("state", state.clone()),
    ];
    if !scope.is_empty() {
        auth_params.push(("scope", scope.to_string()));
    }

    let auth_url_full = format!(
        "{}?{}",
        auth_url,
        auth_params
            .iter()
            .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
            .collect::<Vec<_>>()
            .join("&")
    );

    open_browser(&auth_url_full)?;

    let callback_result = result_rx
        .await
        .map_err(|_| "Authorization timed out or was cancelled".to_string())?;

    let _ = shutdown_tx.send(());

    let access_token = callback_result
        .access_token
        .ok_or("No access token received from implicit flow")?;

    let expires_at = callback_result
        .expires_in
        .map(|secs| chrono::Utc::now().timestamp() + secs as i64);

    Ok(OAuthToken {
        access_token,
        refresh_token: None,
        expires_at,
        token_type: callback_result
            .token_type
            .unwrap_or_else(|| "Bearer".to_string()),
    })
}

// ── Token Refresh ──

async fn refresh_token_flow(
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<OAuthToken, String> {
    let client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("grant_type", "refresh_token");
    params.insert("refresh_token", refresh_token);

    let mut req = client.post(token_url).form(&params);
    if !client_id.is_empty() {
        req = req.basic_auth(client_id, Some(client_secret));
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Token refresh failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token refresh returned {status}: {body}"));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read token response body: {e}"))?;

    let token_resp: TokenResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse token response: {e}\nBody: {body}"))?;

    Ok(token_from_response(token_resp))
}

// ── PKCE Helpers ──

fn generate_code_verifier() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    base64_url_encode(&bytes)
}

fn generate_code_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    base64_url_encode(&hash)
}

fn base64_url_encode(input: &[u8]) -> String {
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;
    URL_SAFE_NO_PAD.encode(input)
}

// ── Helpers ──

fn extract_port(callback_url: &str) -> Result<u16, String> {
    url::Url::parse(callback_url)
        .map_err(|e| format!("Invalid callback URL: {e}"))?
        .port()
        .ok_or_else(|| "Callback URL must specify a port".to_string())
}
