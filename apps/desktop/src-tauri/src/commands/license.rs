use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// License tier — determines feature access.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LicenseTier {
    Free,
    Pro,
    Team,
}

/// License status returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub tier: LicenseTier,
    pub email: Option<String>,
    pub expires_at: Option<String>,
    pub seats: Option<u32>,
    pub grace_period: bool,
    pub valid: bool,
}

/// Claims embedded in the license JWT.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseClaims {
    pub tier: LicenseTier,
    pub email: String,
    #[serde(default)]
    pub seats: Option<u32>,
    /// Unix timestamp (seconds)
    pub exp: i64,
    /// Issued at (seconds)
    pub iat: i64,
}

/// Managed Tauri state for license.
pub struct LicenseState {
    pub status: Mutex<LicenseStatus>,
    pub license_path: PathBuf,
}

impl LicenseState {
    pub fn new(apiark_dir: &std::path::Path) -> Self {
        let license_path = apiark_dir.join("license.key");
        let status = load_license_status(&license_path);
        Self {
            status: Mutex::new(status),
            license_path,
        }
    }
}

const GRACE_PERIOD_DAYS: i64 = 14;

/// Load and validate the license from disk.
fn load_license_status(path: &std::path::Path) -> LicenseStatus {
    let free = LicenseStatus {
        tier: LicenseTier::Free,
        email: None,
        expires_at: None,
        seats: None,
        grace_period: false,
        valid: true,
    };

    let token = match std::fs::read_to_string(path) {
        Ok(t) => t.trim().to_string(),
        Err(_) => return free,
    };

    if token.is_empty() {
        return free;
    }

    // Decode JWT without cryptographic verification for now.
    // In production, embed the public key and verify the signature.
    // For now we use insecure decoding to allow development/testing.
    let mut validation = jsonwebtoken::Validation::default();
    validation.insecure_disable_signature_validation();
    validation.validate_exp = false;
    validation.required_spec_claims.clear();

    let key = jsonwebtoken::DecodingKey::from_secret(b"");

    match jsonwebtoken::decode::<LicenseClaims>(&token, &key, &validation) {
        Ok(data) => {
            let claims = data.claims;
            let now = chrono::Utc::now().timestamp();
            let expired = now > claims.exp;
            let in_grace = expired && now < claims.exp + GRACE_PERIOD_DAYS * 86400;
            let valid = !expired || in_grace;

            LicenseStatus {
                tier: if valid {
                    claims.tier
                } else {
                    LicenseTier::Free
                },
                email: Some(claims.email),
                expires_at: Some(
                    chrono::DateTime::from_timestamp(claims.exp, 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_default(),
                ),
                seats: claims.seats,
                grace_period: in_grace,
                valid,
            }
        }
        Err(e) => {
            tracing::warn!("Invalid license key: {e}");
            free
        }
    }
}

#[tauri::command]
pub async fn get_license_status(
    state: tauri::State<'_, LicenseState>,
) -> Result<LicenseStatus, String> {
    let status = state.status.lock().map_err(|e| e.to_string())?;
    Ok(status.clone())
}

#[tauri::command]
pub async fn activate_license(
    key: String,
    state: tauri::State<'_, LicenseState>,
) -> Result<LicenseStatus, String> {
    // Write key to disk
    std::fs::write(&state.license_path, key.trim())
        .map_err(|e| format!("Failed to save license: {e}"))?;

    // Reload
    let new_status = load_license_status(&state.license_path);
    if !new_status.valid && new_status.email.is_none() {
        // Invalid JWT — remove the file
        let _ = std::fs::remove_file(&state.license_path);
        return Err("Invalid license key".to_string());
    }

    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    *status = new_status.clone();
    Ok(new_status)
}

#[tauri::command]
pub async fn deactivate_license(
    state: tauri::State<'_, LicenseState>,
) -> Result<LicenseStatus, String> {
    let _ = std::fs::remove_file(&state.license_path);
    let free = LicenseStatus {
        tier: LicenseTier::Free,
        email: None,
        expires_at: None,
        seats: None,
        grace_period: false,
        valid: true,
    };
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    *status = free.clone();
    Ok(free)
}

/// Check if a feature is available for the given tier.
pub fn is_feature_available(tier: LicenseTier, feature: &str) -> bool {
    match feature {
        // Pro features
        "mock_servers" | "monitors" | "docs_gen" | "response_diff" | "parallel_runner" => {
            matches!(tier, LicenseTier::Pro | LicenseTier::Team)
        }
        // Team features
        "git_ui" | "team_env_sharing" | "sso_saml" | "audit_logs" => {
            matches!(tier, LicenseTier::Team)
        }
        // Everything else is free
        _ => true,
    }
}
