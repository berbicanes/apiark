use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent_color")]
    pub accent_color: String,
    #[serde(default)]
    pub proxy_url: Option<String>,
    #[serde(default)]
    pub proxy_username: Option<String>,
    #[serde(default)]
    pub proxy_password: Option<String>,
    #[serde(default = "default_true")]
    pub verify_ssl: bool,
    #[serde(default = "default_true")]
    pub follow_redirects: bool,
    #[serde(default = "default_timeout")]
    pub timeout_ms: u64,
    #[serde(default = "default_sidebar_width")]
    pub sidebar_width: u32,
    #[serde(default)]
    pub onboarding_complete: bool,
    #[serde(default)]
    pub crash_reports_enabled: Option<bool>,
    /// Path to a custom CA certificate (PEM format)
    #[serde(default)]
    pub ca_cert_path: Option<String>,
    /// Path to a client certificate (PEM or PFX/PKCS12)
    #[serde(default)]
    pub client_cert_path: Option<String>,
    /// Path to the client certificate private key (PEM, required for PEM certs)
    #[serde(default)]
    pub client_key_path: Option<String>,
    /// Passphrase for PFX/PKCS12 client certificates
    #[serde(default)]
    pub client_cert_passphrase: Option<String>,
    /// Update channel: "stable", "beta", or "nightly"
    #[serde(default = "default_update_channel")]
    pub update_channel: String,
    /// AI assistant: OpenAI-compatible API endpoint
    #[serde(default)]
    pub ai_endpoint: Option<String>,
    /// AI assistant: API key
    #[serde(default)]
    pub ai_api_key: Option<String>,
    /// AI assistant: model name
    #[serde(default)]
    pub ai_model: Option<String>,
    /// Request/Response panel split ratio (0.0-1.0, proportion for request panel)
    #[serde(default = "default_panel_ratio")]
    pub panel_ratio: f64,
    /// Layout mode: "horizontal" (side-by-side) or "vertical" (stacked)
    #[serde(default = "default_layout")]
    pub layout: String,
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_accent_color() -> String {
    "indigo".to_string()
}

fn default_true() -> bool {
    true
}

fn default_timeout() -> u64 {
    30000
}

fn default_sidebar_width() -> u32 {
    256
}

fn default_update_channel() -> String {
    "stable".to_string()
}

fn default_panel_ratio() -> f64 {
    0.5
}

fn default_layout() -> String {
    "horizontal".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            accent_color: default_accent_color(),
            proxy_url: None,
            proxy_username: None,
            proxy_password: None,
            verify_ssl: true,
            follow_redirects: true,
            timeout_ms: default_timeout(),
            sidebar_width: default_sidebar_width(),
            onboarding_complete: false,
            crash_reports_enabled: None,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            client_cert_passphrase: None,
            update_channel: default_update_channel(),
            ai_endpoint: None,
            ai_api_key: None,
            ai_model: None,
            panel_ratio: default_panel_ratio(),
            layout: default_layout(),
        }
    }
}

pub fn load_settings(path: &Path) -> AppSettings {
    match std::fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_else(|e| {
            tracing::warn!("Failed to parse settings, using defaults: {e}");
            AppSettings::default()
        }),
        Err(_) => AppSettings::default(),
    }
}

pub fn save_settings(path: &Path, settings: &AppSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {e}"))?;
    }

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {e}"))?;

    // Atomic write: write to .tmp then rename
    let tmp_path = path.with_extension("json.tmp");
    std::fs::write(&tmp_path, &json).map_err(|e| format!("Failed to write settings: {e}"))?;
    std::fs::rename(&tmp_path, path).map_err(|e| format!("Failed to rename settings file: {e}"))?;

    Ok(())
}
