use tauri::State;

use crate::models::auth::AuthConfig;
use crate::oauth::flow::execute_oauth_flow;
use crate::oauth::{OAuthTokenStatus, OAuthTokenStore};

#[tauri::command]
pub async fn oauth_start_flow(
    app: tauri::AppHandle,
    store: State<'_, OAuthTokenStore>,
    auth_config: AuthConfig,
) -> Result<String, String> {
    let open_browser = move |url: &str| -> Result<(), String> {
        let url = url.to_string();
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            use tauri_plugin_shell::ShellExt;
            if let Err(e) = app
                .shell()
                .open(&url, None::<tauri_plugin_shell::open::Program>)
            {
                tracing::error!("Failed to open browser: {e}");
            }
        });
        Ok(())
    };

    execute_oauth_flow(&auth_config, &store, open_browser).await
}

#[tauri::command]
pub async fn oauth_get_token_status(
    store: State<'_, OAuthTokenStore>,
    key: String,
) -> Result<OAuthTokenStatus, String> {
    match store.get(&key) {
        Some(token) => Ok(OAuthTokenStatus {
            has_token: true,
            is_expired: token.is_expired(),
            expires_at: token.expires_at,
            token_type: Some(token.token_type),
        }),
        None => Ok(OAuthTokenStatus {
            has_token: false,
            is_expired: false,
            expires_at: None,
            token_type: None,
        }),
    }
}

#[tauri::command]
pub async fn oauth_clear_token(
    store: State<'_, OAuthTokenStore>,
    key: String,
) -> Result<(), String> {
    store.remove(&key);
    Ok(())
}
