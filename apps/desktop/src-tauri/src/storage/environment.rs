use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::models::environment::{EnvironmentFile, EnvironmentScope};

/// Load all environments from both shared and personal directories.
pub fn load_environments(collection_path: &Path) -> Result<Vec<EnvironmentFile>, String> {
    let mut envs = Vec::new();

    // Load shared environments (.apiark/environments/)
    let shared_dir = collection_path.join(".apiark").join("environments");
    load_envs_from_dir(&shared_dir, EnvironmentScope::Shared, &mut envs)?;

    // Load personal environments (.apiark/environments.local/)
    let personal_dir = collection_path.join(".apiark").join("environments.local");
    load_envs_from_dir(&personal_dir, EnvironmentScope::Personal, &mut envs)?;

    // Deduplicate by name (case-insensitive). Personal scope takes priority over shared scope.
    let mut deduped: Vec<EnvironmentFile> = Vec::new();
    for env in envs {
        if let Some(existing) = deduped
            .iter_mut()
            .find(|e| e.name.eq_ignore_ascii_case(&env.name))
        {
            if matches!(env.scope, EnvironmentScope::Personal) {
                *existing = env;
            }
        } else {
            deduped.push(env);
        }
    }

    deduped.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(deduped)
}

fn load_envs_from_dir(
    dir: &Path,
    scope: EnvironmentScope,
    envs: &mut Vec<EnvironmentFile>,
) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read environments dir: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {e}"))?;
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "yaml" || e == "yml") {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
            let mut env: EnvironmentFile = serde_yaml::from_str(&content)
                .map_err(|e| format!("Invalid environment YAML {}: {e}", path.display()))?;
            env.scope = scope.clone();
            envs.push(env);
        }
    }
    Ok(())
}

/// Parse a .env file into a HashMap.
fn parse_dotenv(path: &Path) -> HashMap<String, String> {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return HashMap::new(),
    };

    let mut vars = HashMap::new();
    for line in content.lines() {
        let line = line.trim();
        // Skip comments and blank lines
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().to_string();
            let value = value.trim().to_string();
            // Strip surrounding quotes if present
            let value = if (value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\''))
            {
                value[1..value.len() - 1].to_string()
            } else {
                value
            };
            vars.insert(key, value);
        }
    }

    vars
}

/// Load variables from the collection root .env file.
pub fn load_root_dotenv(collection_path: &Path) -> HashMap<String, String> {
    let env_path = collection_path.join(".env");
    if !env_path.exists() {
        return HashMap::new();
    }
    parse_dotenv(&env_path)
}

/// Load secrets from the .apiark/.env file.
pub fn load_dotenv_secrets(collection_path: &Path) -> HashMap<String, String> {
    let env_path = collection_path.join(".apiark").join(".env");
    if !env_path.exists() {
        return HashMap::new();
    }
    parse_dotenv(&env_path)
}

/// Resolve all variables for a given environment, merging:
/// 1. Root .env variables (lowest priority)
/// 2. Environment YAML variables
/// 3. .apiark/.env secrets (declared in environment's secrets list) (highest priority)
pub fn get_resolved_variables(
    collection_path: &Path,
    environment_name: &str,
) -> Result<HashMap<String, String>, String> {
    let envs = load_environments(collection_path)?;
    let env = envs
        .iter()
        .find(|e| e.name == environment_name)
        .ok_or_else(|| format!("Environment '{}' not found", environment_name))?;

    // Start with root .env (lowest priority)
    let mut variables = load_root_dotenv(collection_path);

    // Override with environment YAML variables
    variables.extend(env.variables.clone());

    // Override with .apiark/.env secrets (highest priority)
    let secrets = load_dotenv_secrets(collection_path);
    for secret_key in &env.secrets {
        if let Some(value) = secrets.get(secret_key) {
            variables.insert(secret_key.clone(), value.clone());
        }
    }
    Ok(variables)
}

/// Save an environment file to disk. Saves to shared or personal directory based on scope.
/// If `original_name` or `original_scope` are provided and differ, deletes the old file.
pub fn save_environment(
    collection_path: &Path,
    env: &EnvironmentFile,
    original_name: Option<&str>,
    original_scope: Option<&EnvironmentScope>,
) -> Result<(), String> {
    let subdir = match env.scope {
        EnvironmentScope::Personal => "environments.local",
        EnvironmentScope::Shared => "environments",
    };
    let env_dir = collection_path.join(".apiark").join(subdir);
    fs::create_dir_all(&env_dir).map_err(|e| format!("Failed to create environments dir: {e}"))?;

    // Ensure .gitignore exists in personal dir
    if matches!(env.scope, EnvironmentScope::Personal) {
        let gitignore = env_dir.join(".gitignore");
        if !gitignore.exists() {
            let _ = fs::write(&gitignore, "*\n!.gitignore\n");
        }
    }

    let filename = env.name.to_lowercase().replace(' ', "-");
    let file_path = env_dir.join(format!("{filename}.yaml"));

    // Check if an old file exists and needs deletion (e.g. rename or scope change)
    let old_name = original_name.unwrap_or(&env.name);
    let old_scope = original_scope.unwrap_or(&env.scope);
    let old_subdir = match old_scope {
        EnvironmentScope::Personal => "environments.local",
        EnvironmentScope::Shared => "environments",
    };
    let old_dir = collection_path.join(".apiark").join(old_subdir);
    let old_file_path = find_env_file(&old_dir, old_name);

    let yaml =
        serde_yaml::to_string(env).map_err(|e| format!("Failed to serialize environment: {e}"))?;

    // Atomic write
    let tmp_path = file_path.with_extension("apiark.tmp");
    fs::write(&tmp_path, &yaml).map_err(|e| format!("Failed to write temp file: {e}"))?;
    fs::rename(&tmp_path, &file_path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename temp file: {e}")
    })?;

    // If old file existed and is different from the newly written file path, delete it
    if let Some(old_path) = old_file_path {
        let same_file = match (fs::canonicalize(&old_path), fs::canonicalize(&file_path)) {
            (Ok(a), Ok(b)) => a == b,
            _ => old_path == file_path,
        };
        if !same_file && old_path.exists() {
            let _ = fs::remove_file(&old_path);
        }
    }

    Ok(())
}

fn find_env_file(dir: &Path, name: &str) -> Option<std::path::PathBuf> {
    if !dir.exists() {
        return None;
    }
    let target_stem = name.to_lowercase().replace(' ', "-");
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().is_some_and(|e| e == "yaml" || e == "yml") {
                if let Some(stem) = p.file_stem().and_then(|s| s.to_str()) {
                    let stem_clean = stem.to_lowercase().replace(' ', "-");
                    if stem_clean == target_stem || stem.eq_ignore_ascii_case(name) {
                        return Some(p);
                    }
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_and_rename_environment() {
        let temp_dir = tempfile::tempdir().unwrap();
        let collection_path = temp_dir.path();

        let mut env = EnvironmentFile {
            name: "Dev".to_string(),
            variables: HashMap::from([("k".to_string(), "v".to_string())]),
            secrets: Vec::new(),
            scope: EnvironmentScope::Shared,
        };

        // 1. Initial save
        save_environment(collection_path, &env, None, None).unwrap();
        let envs = load_environments(collection_path).unwrap();
        assert_eq!(envs.len(), 1);
        assert_eq!(envs[0].name, "Dev");

        // 2. Rename Dev -> Development
        env.name = "Development".to_string();
        save_environment(
            collection_path,
            &env,
            Some("Dev"),
            Some(&EnvironmentScope::Shared),
        )
        .unwrap();

        let envs = load_environments(collection_path).unwrap();
        assert_eq!(envs.len(), 1, "Old dev.yaml must be deleted so only 1 env remains");
        assert_eq!(envs[0].name, "Development");

        // 3. Change scope: Shared -> Personal
        env.scope = EnvironmentScope::Personal;
        save_environment(
            collection_path,
            &env,
            Some("Development"),
            Some(&EnvironmentScope::Shared),
        )
        .unwrap();

        let envs = load_environments(collection_path).unwrap();
        assert_eq!(envs.len(), 1, "Only personal development.yaml should exist");
        assert!(matches!(envs[0].scope, EnvironmentScope::Personal));
    }

    #[test]
    fn test_load_environments_deduplication() {
        let temp_dir = tempfile::tempdir().unwrap();
        let collection_path = temp_dir.path();
        let env_dir = collection_path.join(".apiark").join("environments");
        fs::create_dir_all(&env_dir).unwrap();

        // Write two files on disk with same environment name (e.g. from sanitization clash)
        fs::write(
            env_dir.join("dev-baru-(proper)-(copy).yaml"),
            "name: Dev Baru\nvariables:\n  a: '1'\n",
        )
        .unwrap();
        fs::write(
            env_dir.join("dev-baru-_proper_-_copy.yaml"),
            "name: Dev Baru\nvariables:\n  a: '2'\n",
        )
        .unwrap();

        let envs = load_environments(collection_path).unwrap();
        assert_eq!(envs.len(), 1, "Must deduplicate environments with same name");
        assert_eq!(envs[0].name, "Dev Baru");
    }
}
