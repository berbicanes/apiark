use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Router;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::net::TcpListener;

/// A captured HTTP request/response pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapturedRequest {
    pub id: String,
    pub method: String,
    pub url: String,
    pub request_headers: HashMap<String, String>,
    pub request_body: Option<String>,
    pub status: Option<u16>,
    pub response_headers: HashMap<String, String>,
    pub response_body: Option<String>,
    pub time_ms: u64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyStatus {
    pub running: bool,
    pub port: u16,
    pub capture_count: usize,
}

struct ProxyState {
    app: AppHandle,
    captures: Arc<Mutex<Vec<CapturedRequest>>>,
    passthrough_domains: Arc<Mutex<Vec<String>>>,
}

pub struct ProxyCaptureManager {
    shutdown_tx: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
    port: Mutex<u16>,
    captures: Arc<Mutex<Vec<CapturedRequest>>>,
    passthrough_domains: Arc<Mutex<Vec<String>>>,
}

impl ProxyCaptureManager {
    pub fn new() -> Self {
        Self {
            shutdown_tx: Mutex::new(None),
            port: Mutex::new(0),
            captures: Arc::new(Mutex::new(Vec::new())),
            passthrough_domains: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn is_running(&self) -> bool {
        self.shutdown_tx.lock().unwrap().is_some()
    }

    pub fn status(&self) -> ProxyStatus {
        ProxyStatus {
            running: self.is_running(),
            port: *self.port.lock().unwrap(),
            capture_count: self.captures.lock().unwrap().len(),
        }
    }

    pub fn get_captures(&self) -> Vec<CapturedRequest> {
        self.captures.lock().unwrap().clone()
    }

    pub fn clear_captures(&self) {
        self.captures.lock().unwrap().clear();
    }

    pub fn set_passthrough_domains(&self, domains: Vec<String>) {
        *self.passthrough_domains.lock().unwrap() = domains;
    }

    pub async fn start(&self, port: u16, app: AppHandle) -> Result<(), String> {
        if self.is_running() {
            return Err("Proxy is already running".to_string());
        }

        let state = ProxyState {
            app: app.clone(),
            captures: Arc::clone(&self.captures),
            passthrough_domains: Arc::clone(&self.passthrough_domains),
        };

        let shared_state = Arc::new(state);
        let state_for_handler = Arc::clone(&shared_state);
        let router = Router::new().fallback(move |req: axum::extract::Request| {
            let state = Arc::clone(&state_for_handler);
            async move { proxy_handler(state, req).await }
        });

        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let listener = TcpListener::bind(addr)
            .await
            .map_err(|e| format!("Failed to bind proxy to port {port}: {e}"))?;

        let actual_port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local addr: {e}"))?
            .port();

        *self.port.lock().unwrap() = actual_port;

        let (tx, rx) = tokio::sync::oneshot::channel::<()>();
        *self.shutdown_tx.lock().unwrap() = Some(tx);

        tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async {
                    let _ = rx.await;
                })
                .await
                .ok();
        });

        tracing::info!("Proxy capture started on port {actual_port}");
        Ok(())
    }

    pub fn stop(&self) {
        if let Some(tx) = self.shutdown_tx.lock().unwrap().take() {
            let _ = tx.send(());
            *self.port.lock().unwrap() = 0;
            tracing::info!("Proxy capture stopped");
        }
    }
}

/// Forward the request to the target and capture the exchange.
async fn proxy_handler(state: Arc<ProxyState>, req: axum::extract::Request) -> impl IntoResponse {
    let start = std::time::Instant::now();
    let method = req.method().to_string();
    let uri = req.uri().to_string();
    let id = uuid::Uuid::new_v4().to_string();

    // Collect request headers
    let req_headers: HashMap<String, String> = req
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    // Check passthrough
    let is_passthrough = if let Some(host) = req_headers.get("host") {
        let domains = state.passthrough_domains.lock().unwrap();
        domains.iter().any(|d| host.contains(d.as_str()))
    } else {
        false
    };

    if is_passthrough {
        match forward_request(req).await {
            Ok(resp) => return resp,
            Err(_) => {
                return (StatusCode::BAD_GATEWAY, "Passthrough forward failed").into_response()
            }
        }
    }

    // Read request body
    let (parts, body) = req.into_parts();
    let req_body_bytes = axum::body::to_bytes(body, 10 * 1024 * 1024)
        .await
        .unwrap_or_default();
    let req_body = if req_body_bytes.is_empty() {
        None
    } else {
        Some(String::from_utf8_lossy(&req_body_bytes).to_string())
    };

    // Build target URL
    let target_url = if uri.starts_with("http") {
        uri.clone()
    } else if let Some(host) = req_headers.get("host") {
        format!("http://{host}{uri}")
    } else {
        let capture = CapturedRequest {
            id,
            method,
            url: uri,
            request_headers: req_headers,
            request_body: req_body,
            status: Some(502),
            response_headers: HashMap::new(),
            response_body: Some("No host header".to_string()),
            time_ms: start.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        emit_capture(&state, capture);
        return (StatusCode::BAD_GATEWAY, "No host header").into_response();
    };

    // Forward request
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap();

    let mut req_builder = client.request(
        reqwest::Method::from_bytes(parts.method.as_str().as_bytes()).unwrap(),
        &target_url,
    );

    for (k, v) in &req_headers {
        if k != "host" && k != "transfer-encoding" {
            req_builder = req_builder.header(k, v);
        }
    }

    if !req_body_bytes.is_empty() {
        req_builder = req_builder.body(req_body_bytes.to_vec());
    }

    match req_builder.send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let resp_headers: HashMap<String, String> = resp
                .headers()
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                .collect();
            let resp_body_bytes = resp.bytes().await.unwrap_or_default();
            let resp_body = String::from_utf8_lossy(&resp_body_bytes).to_string();
            let elapsed = start.elapsed().as_millis() as u64;

            let capture = CapturedRequest {
                id: id.clone(),
                method: method.clone(),
                url: target_url,
                request_headers: req_headers,
                request_body: req_body,
                status: Some(status),
                response_headers: resp_headers.clone(),
                response_body: Some(resp_body.clone()),
                time_ms: elapsed,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            emit_capture(&state, capture);

            // Build response
            let mut builder = axum::http::Response::builder().status(status);
            for (k, v) in &resp_headers {
                if k != "transfer-encoding" {
                    builder = builder.header(k, v);
                }
            }
            builder
                .body(Body::from(resp_body_bytes.to_vec()))
                .unwrap_or_else(|_| {
                    (StatusCode::INTERNAL_SERVER_ERROR, "Response build failed").into_response()
                })
                .into_response()
        }
        Err(e) => {
            let elapsed = start.elapsed().as_millis() as u64;
            let capture = CapturedRequest {
                id,
                method,
                url: target_url,
                request_headers: req_headers,
                request_body: req_body,
                status: None,
                response_headers: HashMap::new(),
                response_body: Some(e.to_string()),
                time_ms: elapsed,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            emit_capture(&state, capture);
            (StatusCode::BAD_GATEWAY, e.to_string()).into_response()
        }
    }
}

fn emit_capture(state: &ProxyState, capture: CapturedRequest) {
    // Keep max 10,000 captures
    {
        let mut captures = state.captures.lock().unwrap();
        if captures.len() >= 10_000 {
            captures.remove(0);
        }
        captures.push(capture.clone());
    }
    let _ = state.app.emit("proxy:capture", &capture);
}

async fn forward_request(req: axum::extract::Request) -> Result<axum::response::Response, String> {
    let (parts, body) = req.into_parts();
    let body_bytes = axum::body::to_bytes(body, 10 * 1024 * 1024)
        .await
        .map_err(|e| e.to_string())?;

    let host = parts
        .headers
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let uri = parts.uri.to_string();
    let url = if uri.starts_with("http") {
        uri
    } else {
        format!("http://{host}{uri}")
    };

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap();

    let mut req_builder = client.request(
        reqwest::Method::from_bytes(parts.method.as_str().as_bytes()).unwrap(),
        &url,
    );

    for (k, v) in &parts.headers {
        if k != "host" && k != "transfer-encoding" {
            req_builder = req_builder.header(k, v);
        }
    }

    if !body_bytes.is_empty() {
        req_builder = req_builder.body(body_bytes.to_vec());
    }

    let resp = req_builder.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let headers = resp.headers().clone();
    let resp_bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let mut builder = axum::http::Response::builder().status(status);
    for (k, v) in &headers {
        if k != "transfer-encoding" {
            builder = builder.header(k, v);
        }
    }

    builder
        .body(Body::from(resp_bytes.to_vec()))
        .map_err(|e| e.to_string())
}
