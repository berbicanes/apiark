use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use axum::body::Body;
use axum::extract::State;
use axum::http::{Method, Request, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::any;
use axum::Router;
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

use crate::models::collection::RequestFile;
use crate::storage::collection;

use super::{MockEndpoint, MockRequestLog, MockServerConfig, MockServerStatus};

struct MockState {
    endpoints: Vec<MockEndpoint>,
    latency_ms: u64,
    error_rate: f64,
    app: AppHandle,
    server_id: String,
}

pub struct MockServerManager {
    servers: Mutex<HashMap<String, ServerHandle>>,
}

struct ServerHandle {
    status: MockServerStatus,
    shutdown_tx: oneshot::Sender<()>,
}

impl MockServerManager {
    pub fn new() -> Self {
        Self {
            servers: Mutex::new(HashMap::new()),
        }
    }

    pub async fn start(
        &self,
        config: MockServerConfig,
        app: AppHandle,
    ) -> Result<MockServerStatus, String> {
        let server_id = format!(
            "mock_{}_{}",
            config.port,
            chrono::Utc::now().timestamp_millis()
        );

        // Build endpoints from collection request files
        let endpoints = build_endpoints_from_collection(&config.collection_path)?;

        if endpoints.is_empty() {
            return Err("No request files with example responses found in collection".to_string());
        }

        let collection_name = std::path::Path::new(&config.collection_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let status = MockServerStatus {
            id: server_id.clone(),
            collection_name: collection_name.clone(),
            port: config.port,
            endpoints: endpoints.clone(),
            running: true,
        };

        let state = Arc::new(MockState {
            endpoints: endpoints.clone(),
            latency_ms: config.latency_ms,
            error_rate: config.error_rate,
            app: app.clone(),
            server_id: server_id.clone(),
        });

        // Build router
        let router = Router::new()
            .fallback(any(handle_mock_request))
            .with_state(state);

        let addr = SocketAddr::from(([127, 0, 0, 1], config.port));
        let listener = tokio::net::TcpListener::bind(addr)
            .await
            .map_err(|e| format!("Failed to bind to port {}: {e}", config.port))?;

        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        // Spawn the server
        tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .ok();
        });

        tracing::info!(
            port = config.port,
            endpoints = endpoints.len(),
            "Mock server started"
        );

        let mut servers = self
            .servers
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        servers.insert(
            server_id.clone(),
            ServerHandle {
                status: status.clone(),
                shutdown_tx,
            },
        );

        Ok(status)
    }

    pub fn stop(&self, server_id: &str) -> Result<(), String> {
        let mut servers = self
            .servers
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        if let Some(handle) = servers.remove(server_id) {
            let _ = handle.shutdown_tx.send(());
            tracing::info!(id = server_id, "Mock server stopped");
        }
        Ok(())
    }

    pub fn list(&self) -> Result<Vec<MockServerStatus>, String> {
        let servers = self
            .servers
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        Ok(servers.values().map(|h| h.status.clone()).collect())
    }
}

async fn handle_mock_request(
    State(state): State<Arc<MockState>>,
    request: Request<Body>,
) -> Response {
    let start = Instant::now();
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    // Simulate latency
    if state.latency_ms > 0 {
        tokio::time::sleep(std::time::Duration::from_millis(state.latency_ms)).await;
    }

    // Simulate error rate
    if state.error_rate > 0.0 && rand::random::<f64>() < state.error_rate {
        let elapsed = start.elapsed().as_millis() as u64;
        emit_log(&state, &method, &path, 500, elapsed);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Simulated error").into_response();
    }

    // Find matching endpoint
    let endpoint = state
        .endpoints
        .iter()
        .find(|e| e.method.eq_ignore_ascii_case(&method) && paths_match(&e.path, &path));

    let (status, body, content_type) = if let Some(ep) = endpoint {
        (ep.status, ep.body.clone(), ep.content_type.clone())
    } else {
        (
            404,
            r#"{"error": "Not found"}"#.to_string(),
            "application/json".to_string(),
        )
    };

    let elapsed = start.elapsed().as_millis() as u64;
    emit_log(&state, &method, &path, status, elapsed);

    Response::builder()
        .status(status)
        .header("Content-Type", content_type)
        .header("X-Mock-Server", "ApiArk")
        .body(Body::from(body))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

fn emit_log(state: &MockState, method: &str, path: &str, status: u16, time_ms: u64) {
    let log = MockRequestLog {
        method: method.to_string(),
        path: path.to_string(),
        status,
        time_ms,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    let _ = state
        .app
        .emit(&format!("mock:request:{}", state.server_id), &log);
}

fn paths_match(pattern: &str, actual: &str) -> bool {
    // Simple path matching — exact or with trailing slash normalization
    let p = pattern.trim_end_matches('/');
    let a = actual.trim_end_matches('/');
    p == a
}

fn build_endpoints_from_collection(collection_path: &str) -> Result<Vec<MockEndpoint>, String> {
    let path = std::path::Path::new(collection_path);
    let mut endpoints = Vec::new();

    // Walk the collection directory for .yaml request files
    walk_yaml_files(path, path, &mut endpoints)?;

    Ok(endpoints)
}

fn walk_yaml_files(
    root: &std::path::Path,
    dir: &std::path::Path,
    endpoints: &mut Vec<MockEndpoint>,
) -> Result<(), String> {
    if !dir.exists() || !dir.is_dir() {
        return Ok(());
    }

    for entry in std::fs::read_dir(dir).map_err(|e| format!("Read dir error: {e}"))? {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let path = entry.path();

        if path.is_dir() {
            // Skip .apiark directory
            if path
                .file_name()
                .map(|n| n.to_string_lossy().starts_with('.'))
                .unwrap_or(false)
            {
                continue;
            }
            walk_yaml_files(root, &path, endpoints)?;
        } else if path
            .extension()
            .map(|e| e == "yaml" || e == "yml")
            .unwrap_or(false)
        {
            // Skip folder config files
            if path
                .file_name()
                .map(|n| n.to_string_lossy().starts_with('_'))
                .unwrap_or(false)
            {
                continue;
            }

            if let Ok(request) = collection::read_request(&path) {
                // Build mock endpoint from request URL and method
                let url_path = extract_path_from_url(&request.url);
                let body = get_example_body(&request);
                let status = get_example_status(&request);

                endpoints.push(MockEndpoint {
                    method: format!("{:?}", request.method).to_uppercase(),
                    path: url_path,
                    status,
                    body,
                    content_type: "application/json".to_string(),
                });
            }
        }
    }

    Ok(())
}

fn extract_path_from_url(url: &str) -> String {
    // Strip variable references and extract path portion
    let url = url.replace("{{baseUrl}}", "").replace("{{base_url}}", "");
    if let Ok(parsed) = url::Url::parse(&format!("http://localhost{url}")) {
        parsed.path().to_string()
    } else if url.starts_with('/') {
        url.split('?').next().unwrap_or(&url).to_string()
    } else {
        // Try parsing as full URL
        if let Ok(parsed) = url::Url::parse(&url) {
            parsed.path().to_string()
        } else {
            format!("/{url}")
        }
    }
}

fn get_example_body(request: &RequestFile) -> String {
    // Use the request body as example response, or a default
    if let Some(body) = &request.body {
        if !body.content.is_empty() {
            return body.content.clone();
        }
    }
    r#"{"message": "OK"}"#.to_string()
}

fn get_example_status(request: &RequestFile) -> u16 {
    // Try to get from assertions
    if let Some(assert) = &request.assert {
        if let Some(status) = assert.get("status") {
            if let Some(n) = status.as_u64() {
                return n as u16;
            }
        }
    }
    200
}
