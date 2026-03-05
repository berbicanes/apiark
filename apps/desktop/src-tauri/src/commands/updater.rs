use std::fs;
use std::path::PathBuf;

/// Directory where backup binaries are stored.
fn backups_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Could not determine home directory")
        .join(".apiark")
        .join("backups")
}

/// List available rollback versions (binary names in the backups directory).
#[tauri::command]
pub async fn list_rollback_versions() -> Result<Vec<String>, String> {
    let dir = backups_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut versions = Vec::new();
    let entries =
        fs::read_dir(&dir).map_err(|e| format!("Failed to read backups directory: {e}"))?;

    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            if name.starts_with("apiark-") {
                versions.push(name.to_string());
            }
        }
    }

    versions.sort();
    versions.reverse();
    // Keep only last 3
    versions.truncate(3);
    Ok(versions)
}

/// Backup the current binary before applying an update.
/// Returns the backup file path.
#[tauri::command]
pub async fn backup_current_binary() -> Result<String, String> {
    let dir = backups_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create backups directory: {e}"))?;

    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {e}"))?;

    let version = env!("CARGO_PKG_VERSION");
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("apiark-{version}-{timestamp}");

    #[cfg(target_os = "windows")]
    let backup_name = format!("{backup_name}.exe");

    let backup_path = dir.join(&backup_name);

    fs::copy(&current_exe, &backup_path).map_err(|e| format!("Failed to backup binary: {e}"))?;

    // Clean old backups — keep only last 3
    let mut backups: Vec<_> = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read backups: {e}"))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_str()
                .map_or(false, |n| n.starts_with("apiark-"))
        })
        .collect();

    backups.sort_by_key(|e| e.file_name());
    backups.reverse();

    for old in backups.into_iter().skip(3) {
        let _ = fs::remove_file(old.path());
    }

    tracing::info!("Backed up current binary to {}", backup_path.display());
    Ok(backup_path.to_string_lossy().to_string())
}

/// Delete all backup binaries.
#[tauri::command]
pub async fn clear_backups() -> Result<(), String> {
    let dir = backups_dir();
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| format!("Failed to clear backups: {e}"))?;
    }
    Ok(())
}
