use std::path::{Path, PathBuf};

use crate::models::collection::{
    CollectionConfig, CollectionDefaults, CollectionNode, RequestFile,
};
use crate::models::request::HttpMethod;
use crate::storage::collection;

#[tauri::command]
pub async fn get_collection_defaults(
    collection_path: String,
) -> Result<CollectionDefaults, String> {
    let path = collection_path.clone();
    tokio::task::spawn_blocking(move || {
        let config = collection::load_collection_config(Path::new(&path))?;
        Ok(config.defaults)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn update_collection_defaults(
    collection_path: String,
    defaults: CollectionDefaults,
) -> Result<(), String> {
    let path = collection_path.clone();
    tokio::task::spawn_blocking(move || {
        let mut config = collection::load_collection_config(Path::new(&path))?;
        config.defaults = defaults;
        collection::save_collection_config(Path::new(&path), &config)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn open_collection(path: String) -> Result<CollectionNode, String> {
    tracing::info!(path = %path, "Opening collection");
    tokio::task::spawn_blocking(move || {
        let collection_path = Path::new(&path);
        collection::load_collection_tree(collection_path)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn read_request_file(path: String) -> Result<RequestFile, String> {
    tracing::debug!(path = %path, "Reading request file");
    tokio::task::spawn_blocking(move || {
        let file_path = Path::new(&path);
        collection::read_request(file_path)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn save_request_file(path: String, request: RequestFile) -> Result<(), String> {
    tracing::debug!(path = %path, "Saving request file");
    tokio::task::spawn_blocking(move || {
        let file_path = Path::new(&path);
        collection::write_request(file_path, &request)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn create_request(
    dir: String,
    filename: String,
    name: String,
    method: HttpMethod,
    url: String,
) -> Result<String, String> {
    let dir_path = Path::new(&dir);
    let request = RequestFile {
        name,
        method,
        url,
        description: None,
        headers: Default::default(),
        auth: None,
        body: None,
        params: None,
        assert: None,
        tests: None,
        pre_request_script: None,
        post_response_script: None,
        cookies: None,
    };
    let path = collection::create_request_file(dir_path, &filename, &request)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn create_folder(parent: String, name: String) -> Result<String, String> {
    let parent_path = Path::new(&parent);
    let path = collection::create_folder(parent_path, &name)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_item(path: String, collection_name: String) -> Result<String, String> {
    let item_path = Path::new(&path);
    tracing::info!(path = %path, "Deleting item (moving to trash)");
    collection::delete_item(item_path, &collection_name)
}

#[tauri::command]
pub async fn save_folder_order(dir: String, order: Vec<String>) -> Result<(), String> {
    let dir_path = Path::new(&dir);
    tracing::debug!(dir = %dir, "Saving folder order");
    collection::save_folder_order(dir_path, &order)
}

#[tauri::command]
pub async fn rename_item(path: String, new_name: String) -> Result<String, String> {
    let item_path = Path::new(&path);
    tracing::info!(path = %path, new_name = %new_name, "Renaming item");
    let new_path = collection::rename_item(item_path, &new_name)?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn create_sample_collection() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let base = home.join("ApiArk").join("getting-started");

    if base.join(".apiark").join("apiark.yaml").exists() {
        return Ok(base.to_string_lossy().to_string());
    }

    // Create directory structure
    let apiark_dir = base.join(".apiark");
    let env_dir = apiark_dir.join("environments");
    let basics_dir = base.join("basics");

    for d in [&apiark_dir, &env_dir, &basics_dir] {
        std::fs::create_dir_all(d).map_err(|e| format!("Failed to create directory: {e}"))?;
    }

    // Collection config
    let config = CollectionConfig {
        name: "Getting Started".to_string(),
        version: 1,
        defaults: Default::default(),
    };
    let config_yaml =
        serde_yaml::to_string(&config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    std::fs::write(apiark_dir.join("apiark.yaml"), config_yaml)
        .map_err(|e| format!("Failed to write config: {e}"))?;

    // Default environment
    std::fs::write(
        env_dir.join("default.yaml"),
        "name: Default\nvariables:\n  baseUrl: https://httpbin.org\n",
    )
    .map_err(|e| format!("Failed to write env: {e}"))?;

    // .gitignore (inside .apiark/)
    std::fs::write(apiark_dir.join(".gitignore"), ".env\n")
        .map_err(|e| format!("Failed to write .gitignore: {e}"))?;

    // Root .gitignore (covers collection root .env file)
    let root_gitignore = base.join(".gitignore");
    if !root_gitignore.exists() {
        std::fs::write(&root_gitignore, ".env\n.env.local\n")
            .map_err(|e| format!("Failed to write root .gitignore: {e}"))?;
    }

    // Sample requests
    write_sample(&basics_dir.join("simple-get.yaml"),
        "name: Simple GET\nmethod: GET\nurl: \"{{baseUrl}}/get\"\ndescription: A basic GET request to httpbin.org\n"
    )?;

    write_sample(&basics_dir.join("post-json.yaml"),
        "name: POST JSON\nmethod: POST\nurl: \"{{baseUrl}}/post\"\ndescription: Send a JSON body to httpbin.org\nbody:\n  type: json\n  content: |\n    {\n      \"name\": \"ApiArk\",\n      \"version\": \"1.0\"\n    }\n"
    )?;

    write_sample(&basics_dir.join("with-auth.yaml"),
        "name: Bearer Auth\nmethod: GET\nurl: \"{{baseUrl}}/bearer\"\ndescription: GET request with Bearer token authentication\nauth:\n  type: bearer\n  token: my-secret-token\n"
    )?;

    write_sample(&basics_dir.join("query-params.yaml"),
        "name: Query Parameters\nmethod: GET\nurl: \"{{baseUrl}}/get\"\ndescription: GET request with query parameters\nparams:\n  page: \"1\"\n  limit: \"10\"\n  search: hello\n"
    )?;

    Ok(base.to_string_lossy().to_string())
}

fn write_sample(path: &PathBuf, content: &str) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| format!("Failed to write {}: {e}", path.display()))
}
