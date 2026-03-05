use std::fs;
use std::path::PathBuf;

use rcgen::{BasicConstraints, CertificateParams, IsCa, KeyPair, PKCS_ECDSA_P256_SHA256};

/// Get the directory where proxy CA files are stored.
fn proxy_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not determine home directory")
        .join(".apiark")
        .join("proxy")
}

/// Path to the CA certificate PEM file.
pub fn ca_cert_path() -> PathBuf {
    proxy_dir().join("ca-cert.pem")
}

/// Path to the CA private key PEM file.
pub fn ca_key_path() -> PathBuf {
    proxy_dir().join("ca-key.pem")
}

/// Check if a CA certificate already exists.
pub fn ca_exists() -> bool {
    ca_cert_path().exists() && ca_key_path().exists()
}

/// Generate a new self-signed CA certificate for HTTPS interception.
/// Returns the paths to (cert, key) files.
pub fn generate_ca() -> Result<(PathBuf, PathBuf), String> {
    let dir = proxy_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create proxy directory: {e}"))?;

    let key_pair = KeyPair::generate_for(&PKCS_ECDSA_P256_SHA256)
        .map_err(|e| format!("Failed to generate key pair: {e}"))?;

    let mut params = CertificateParams::default();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params
        .distinguished_name
        .push(rcgen::DnType::CommonName, "ApiArk Local CA");
    params
        .distinguished_name
        .push(rcgen::DnType::OrganizationName, "ApiArk");
    // Valid for 10 years
    params.not_before = time::OffsetDateTime::now_utc();
    params.not_after = time::OffsetDateTime::now_utc() + time::Duration::days(3650);

    let cert = params
        .self_signed(&key_pair)
        .map_err(|e| format!("Failed to generate CA certificate: {e}"))?;

    let cert_pem = cert.pem();
    let key_pem = key_pair.serialize_pem();

    let cert_path = ca_cert_path();
    let key_path = ca_key_path();

    fs::write(&cert_path, &cert_pem).map_err(|e| format!("Failed to write CA cert: {e}"))?;
    fs::write(&key_path, &key_pem).map_err(|e| format!("Failed to write CA key: {e}"))?;

    // Set restrictive permissions on the key file (Unix only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&key_path, fs::Permissions::from_mode(0o600));
    }

    tracing::info!("Generated new CA certificate at {}", cert_path.display());
    Ok((cert_path, key_path))
}

/// Ensure the CA certificate exists, generating if needed.
/// Returns paths to (cert, key).
pub fn ensure_ca() -> Result<(PathBuf, PathBuf), String> {
    if ca_exists() {
        Ok((ca_cert_path(), ca_key_path()))
    } else {
        generate_ca()
    }
}

/// Read the CA certificate PEM content (for user to install in their browser/OS).
pub fn read_ca_cert_pem() -> Result<String, String> {
    let path = ca_cert_path();
    fs::read_to_string(&path)
        .map_err(|e| format!("CA certificate not found. Generate it first: {e}"))
}
