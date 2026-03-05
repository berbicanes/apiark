use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

/// Current format version. Bump when making breaking schema changes.
pub const CURRENT_VERSION: u32 = 1;

/// Result of checking a collection's format version.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionStatus {
    pub collection_version: u32,
    pub current_version: u32,
    pub needs_migration: bool,
    pub is_newer: bool,
}

/// Check a collection's format version against the current app version.
pub fn check_version(collection_path: &Path) -> Result<VersionStatus, String> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read collection config: {e}"))?;

    // Parse only the version field (lenient — works even if other fields change)
    #[derive(Deserialize)]
    struct VersionOnly {
        #[serde(default = "default_v1")]
        version: u32,
    }
    fn default_v1() -> u32 {
        1
    }

    let parsed: VersionOnly =
        serde_yaml::from_str(&content).map_err(|e| format!("Invalid collection config: {e}"))?;

    Ok(VersionStatus {
        collection_version: parsed.version,
        current_version: CURRENT_VERSION,
        needs_migration: parsed.version < CURRENT_VERSION,
        is_newer: parsed.version > CURRENT_VERSION,
    })
}

/// Run all migrations from `from_version` to `CURRENT_VERSION` on a collection.
/// Each migration is a pure function that transforms YAML content.
/// Returns the number of files migrated.
pub fn migrate_collection(collection_path: &Path, from_version: u32) -> Result<u32, String> {
    if from_version >= CURRENT_VERSION {
        return Ok(0);
    }

    let mut files_migrated: u32 = 0;
    let mut version = from_version;

    // Chain migrations: v1→v2, v2→v3, etc.
    while version < CURRENT_VERSION {
        let next = version + 1;
        let count = run_migration(collection_path, version, next)?;
        files_migrated += count;
        version = next;
    }

    // Update the version in apiark.yaml
    update_config_version(collection_path, CURRENT_VERSION)?;

    Ok(files_migrated)
}

/// Run a single version migration step.
fn run_migration(collection_path: &Path, _from: u32, _to: u32) -> Result<u32, String> {
    // Migration functions are added here as the schema evolves.
    // Example for a future v1→v2 migration:
    //
    // if _from == 1 && _to == 2 {
    //     return migrate_v1_to_v2(collection_path);
    // }
    //
    // Each migration walks the collection's YAML files and transforms them.
    // For now, no migrations exist (we're at v1).

    let _ = collection_path;
    Ok(0)
}

/// Update the version field in the collection's apiark.yaml config.
fn update_config_version(collection_path: &Path, version: u32) -> Result<(), String> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {e}"))?;

    let mut config: serde_yaml::Value =
        serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse config: {e}"))?;

    if let serde_yaml::Value::Mapping(ref mut map) = config {
        map.insert(
            serde_yaml::Value::String("version".to_string()),
            serde_yaml::Value::Number(version.into()),
        );
    }

    let yaml =
        serde_yaml::to_string(&config).map_err(|e| format!("Failed to serialize config: {e}"))?;

    // Atomic write
    let tmp_path = config_path.with_extension("apiark.tmp");
    fs::write(&tmp_path, &yaml).map_err(|e| format!("Failed to write temp file: {e}"))?;
    fs::rename(&tmp_path, &config_path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename temp file: {e}")
    })
}
