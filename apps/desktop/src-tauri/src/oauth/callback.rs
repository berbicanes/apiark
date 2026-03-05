use axum::{extract::Query, response::Html, routing::get, Router};
use serde::Deserialize;
use std::net::SocketAddr;
use tokio::sync::oneshot;

/// Result extracted from the OAuth callback.
#[derive(Debug, Clone)]
pub struct CallbackResult {
    pub code: Option<String>,
    pub state: Option<String>,
    /// For implicit flow: access_token from fragment (sent via JS POST).
    pub access_token: Option<String>,
    pub token_type: Option<String>,
    pub expires_in: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct CallbackParams {
    code: Option<String>,
    state: Option<String>,
    access_token: Option<String>,
    token_type: Option<String>,
    expires_in: Option<u64>,
}

/// Start a localhost callback server on the given port.
/// Returns a shutdown sender and a receiver for the callback result.
/// The server handles one callback then shuts down (or times out after 120s).
pub async fn start_callback_server(
    port: u16,
) -> Result<(oneshot::Sender<()>, oneshot::Receiver<CallbackResult>), String> {
    let (result_tx, result_rx) = oneshot::channel::<CallbackResult>();
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let result_tx = std::sync::Arc::new(tokio::sync::Mutex::new(Some(result_tx)));
    let result_tx_clone = result_tx.clone();

    let app = Router::new()
        .route(
            "/callback",
            get(move |Query(params): Query<CallbackParams>| {
                let result_tx = result_tx_clone.clone();
                async move {
                    // If we got a code or access_token directly, send it
                    if params.code.is_some() || params.access_token.is_some() {
                        let result = CallbackResult {
                            code: params.code,
                            state: params.state,
                            access_token: params.access_token,
                            token_type: params.token_type,
                            expires_in: params.expires_in,
                        };
                        if let Some(tx) = result_tx.lock().await.take() {
                            let _ = tx.send(result);
                        }
                        return Html(SUCCESS_HTML.to_string());
                    }

                    // For implicit flow: the token is in the URL fragment (not sent to server).
                    // Return a page with JS that extracts the fragment and POSTs it back.
                    Html(IMPLICIT_FRAGMENT_HTML.to_string())
                }
            }),
        )
        .route(
            "/callback/token",
            axum::routing::post(move |Query(params): Query<CallbackParams>| {
                let result_tx = result_tx.clone();
                async move {
                    let result = CallbackResult {
                        code: None,
                        state: params.state,
                        access_token: params.access_token,
                        token_type: params.token_type,
                        expires_in: params.expires_in,
                    };
                    if let Some(tx) = result_tx.lock().await.take() {
                        let _ = tx.send(result);
                    }
                    Html(SUCCESS_HTML.to_string())
                }
            }),
        );

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind callback server on port {port}: {e}"))?;

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                // Shut down on explicit signal OR after 120s timeout
                tokio::select! {
                    _ = shutdown_rx => {}
                    _ = tokio::time::sleep(std::time::Duration::from_secs(120)) => {}
                }
            })
            .await
            .ok();
    });

    Ok((shutdown_tx, result_rx))
}

const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html><head><title>ApiArk - Authorization Complete</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex; justify-content: center; align-items: center; min-height: 100vh;
  margin: 0; background: #0a0a0b; color: #e4e4e7; }
.container { text-align: center; }
h1 { color: #22c55e; font-size: 1.5rem; }
p { color: #a1a1aa; }
</style></head>
<body><div class="container">
<h1>Authorization Complete</h1>
<p>You can close this window and return to ApiArk.</p>
</div></body></html>"#;

const IMPLICIT_FRAGMENT_HTML: &str = r#"<!DOCTYPE html>
<html><head><title>ApiArk - Processing...</title>
<script>
// Extract token from URL fragment and POST it back
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const tokenParams = new URLSearchParams();
for (const [key, value] of params) { tokenParams.append(key, value); }
fetch('/callback/token?' + tokenParams.toString(), { method: 'POST' })
  .then(() => { document.body.innerHTML = '<div style="text-align:center;padding:2rem;font-family:sans-serif;color:#e4e4e7;background:#0a0a0b;min-height:100vh;display:flex;align-items:center;justify-content:center"><div><h1 style="color:#22c55e">Authorization Complete</h1><p style="color:#a1a1aa">You can close this window and return to ApiArk.</p></div></div>'; });
</script></head>
<body style="background:#0a0a0b;color:#e4e4e7;font-family:sans-serif;text-align:center;padding:2rem">
<p>Processing authorization...</p>
</body></html>"#;
