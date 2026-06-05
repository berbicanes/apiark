use std::collections::HashMap;
use std::path::Path;

use crate::models::environment::{EnvironmentFile, EnvironmentScope};
use crate::storage::environment;

/// Load variables from the collection root .env file only (no environment).
#[tauri::command]
pub async fn load_root_dotenv(collection_path: String) -> Result<HashMap<String, String>, String> {
    let path = Path::new(&collection_path);
    Ok(environment::load_root_dotenv(path))
}

#[tauri::command]
pub async fn load_environments(collection_path: String) -> Result<Vec<EnvironmentFile>, String> {
    let path = Path::new(&collection_path);
    tracing::debug!(path = %collection_path, "Loading environments");
    environment::load_environments(path)
}

#[tauri::command]
pub async fn save_environment(
    collection_path: String,
    env: EnvironmentFile,
    scope: Option<String>,
) -> Result<(), String> {
    let path = Path::new(&collection_path);
    let mut env = env;
    if let Some(ref s) = scope {
        env.scope = match s.as_str() {
            "personal" => EnvironmentScope::Personal,
            _ => EnvironmentScope::Shared,
        };
    }
    tracing::debug!(path = %collection_path, name = %env.name, "Saving environment");
    environment::save_environment(path, &env)
}

/// Delete an environment, moving its file to trash. Returns the trash path for undo support.
#[tauri::command]
pub async fn delete_environment(
    collection_path: String,
    environment_name: String,
    scope: Option<String>,
) -> Result<String, String> {
    let path = Path::new(&collection_path);
    let scope = match scope.as_deref() {
        Some("personal") => EnvironmentScope::Personal,
        _ => EnvironmentScope::Shared,
    };
    tracing::info!(path = %collection_path, name = %environment_name, "Deleting environment (moving to trash)");
    environment::delete_environment(path, &environment_name, &scope)
}

/// Resolve all variables for a given environment, merging:
/// 1. Root .env variables (lowest priority)
/// 2. Environment YAML variables
/// 3. .apiark/.env secrets (highest priority)
#[tauri::command]
pub async fn get_resolved_variables(
    collection_path: String,
    environment_name: String,
) -> Result<HashMap<String, String>, String> {
    let path = Path::new(&collection_path);
    environment::get_resolved_variables(path, &environment_name)
}
