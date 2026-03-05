use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::models::environment::EnvironmentFile;

/// Load all environments from a collection's .apiark/environments/ directory.
pub fn load_environments(collection_path: &Path) -> Result<Vec<EnvironmentFile>, String> {
    let env_dir = collection_path.join(".apiark").join("environments");
    if !env_dir.exists() {
        return Ok(Vec::new());
    }

    let mut envs = Vec::new();
    let entries = fs::read_dir(&env_dir)
        .map_err(|e| format!("Failed to read environments dir: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {e}"))?;
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "yaml" || e == "yml") {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
            let env: EnvironmentFile = serde_yaml::from_str(&content)
                .map_err(|e| format!("Invalid environment YAML {}: {e}", path.display()))?;
            envs.push(env);
        }
    }

    envs.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(envs)
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

/// Save an environment file to disk.
pub fn save_environment(collection_path: &Path, env: &EnvironmentFile) -> Result<(), String> {
    let env_dir = collection_path.join(".apiark").join("environments");
    fs::create_dir_all(&env_dir)
        .map_err(|e| format!("Failed to create environments dir: {e}"))?;

    let filename = env.name.to_lowercase().replace(' ', "-");
    let file_path = env_dir.join(format!("{filename}.yaml"));

    let yaml = serde_yaml::to_string(env)
        .map_err(|e| format!("Failed to serialize environment: {e}"))?;

    // Atomic write
    let tmp_path = file_path.with_extension("apiark.tmp");
    fs::write(&tmp_path, &yaml)
        .map_err(|e| format!("Failed to write temp file: {e}"))?;
    fs::rename(&tmp_path, &file_path)
        .map_err(|e| {
            let _ = fs::remove_file(&tmp_path);
            format!("Failed to rename temp file: {e}")
        })
}
