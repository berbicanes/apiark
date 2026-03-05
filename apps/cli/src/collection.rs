use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::models::{CollectionConfig, EnvironmentFile, FolderConfig, RequestFile};

/// Load all request files from a collection directory, recursively.
pub fn load_request_files(collection_path: &Path) -> anyhow::Result<Vec<(String, RequestFile)>> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    if !config_path.exists() {
        anyhow::bail!(
            "Not a valid collection: {} (missing .apiark/apiark.yaml)",
            collection_path.display()
        );
    }

    let mut results = Vec::new();
    collect_requests(collection_path, collection_path, &mut results)?;
    Ok(results)
}

/// Load collection config.
pub fn load_config(collection_path: &Path) -> anyhow::Result<CollectionConfig> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    let content = fs::read_to_string(&config_path)?;
    Ok(serde_yaml::from_str(&content)?)
}

fn collect_requests(
    base: &Path,
    dir: &Path,
    results: &mut Vec<(String, RequestFile)>,
) -> anyhow::Result<()> {
    let mut entries: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();

    // Check for _folder.yaml ordering
    let folder_config = dir.join("_folder.yaml");
    let order: Vec<String> = if folder_config.exists() {
        let content = fs::read_to_string(&folder_config).unwrap_or_default();
        serde_yaml::from_str::<FolderConfig>(&content)
            .map(|c| c.order)
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    // Sort entries by folder order if available
    if !order.is_empty() {
        entries.sort_by(|a, b| {
            let a_name = a.file_name().to_string_lossy().to_string();
            let b_name = b.file_name().to_string_lossy().to_string();
            let a_stem = a_name.strip_suffix(".yaml").or(a_name.strip_suffix(".yml")).unwrap_or(&a_name);
            let b_stem = b_name.strip_suffix(".yaml").or(b_name.strip_suffix(".yml")).unwrap_or(&b_name);
            let a_idx = order.iter().position(|o| o == a_stem).unwrap_or(usize::MAX);
            let b_idx = order.iter().position(|o| o == b_stem).unwrap_or(usize::MAX);
            a_idx.cmp(&b_idx).then(a_name.cmp(&b_name))
        });
    } else {
        entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    }

    for entry in entries {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden dirs and special files
        if name.starts_with('.') || name == "_folder.yaml" {
            continue;
        }

        if path.is_dir() {
            collect_requests(base, &path, results)?;
        } else if name.ends_with(".yaml") || name.ends_with(".yml") {
            match read_request(&path) {
                Ok(req) => {
                    let rel = path.strip_prefix(base).unwrap_or(&path);
                    results.push((rel.display().to_string(), req));
                }
                Err(e) => {
                    eprintln!("Warning: skipping {}: {e}", path.display());
                }
            }
        }
    }

    Ok(())
}

fn read_request(path: &Path) -> anyhow::Result<RequestFile> {
    let content = fs::read_to_string(path)?;
    Ok(serde_yaml::from_str::<RequestFile>(&content)?)
}

/// Load environments from .apiark/environments/
pub fn load_environments(collection_path: &Path) -> anyhow::Result<Vec<EnvironmentFile>> {
    let env_dir = collection_path.join(".apiark").join("environments");
    if !env_dir.exists() {
        return Ok(Vec::new());
    }

    let mut envs = Vec::new();
    for entry in fs::read_dir(&env_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "yaml" || e == "yml") {
            let content = fs::read_to_string(&path)?;
            let env: EnvironmentFile = serde_yaml::from_str(&content)?;
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
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().to_string();
            let value = value.trim().to_string();
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

/// Load .env secrets from .apiark/.env
pub fn load_dotenv_secrets(collection_path: &Path) -> HashMap<String, String> {
    let env_path = collection_path.join(".apiark").join(".env");
    if !env_path.exists() {
        return HashMap::new();
    }
    parse_dotenv(&env_path)
}

/// Resolve all variables for a given environment.
/// Priority: root .env < environment YAML < .apiark/.env secrets
pub fn resolve_variables(
    collection_path: &Path,
    environment_name: &str,
) -> anyhow::Result<HashMap<String, String>> {
    let envs = load_environments(collection_path)?;
    let env = envs
        .iter()
        .find(|e| e.name.eq_ignore_ascii_case(environment_name))
        .ok_or_else(|| anyhow::anyhow!("Environment '{}' not found", environment_name))?;

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
