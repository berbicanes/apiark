use std::collections::HashMap;

use serde_json::Value;

use super::{ImportBody, ImportData, ImportEnvironment, ImportItem, ImportWarning};

/// Parse an OpenAPI 3.0/3.1 spec (JSON or YAML) into ImportData.
pub fn parse_openapi(content: &str) -> Result<ImportData, String> {
    // Parse as YAML (handles both JSON and YAML)
    let root: Value =
        serde_yaml::from_str(content).map_err(|e| format!("Invalid OpenAPI spec: {e}"))?;

    // Validate it's OpenAPI 3.x
    let version = root.get("openapi").and_then(|v| v.as_str()).unwrap_or("");
    if !version.starts_with("3.") {
        return Err(format!(
            "Unsupported OpenAPI version: '{version}'. Only 3.x is supported."
        ));
    }

    let mut warnings = Vec::new();

    let title = root
        .get("info")
        .and_then(|i| i.get("title"))
        .and_then(|v| v.as_str())
        .unwrap_or("Imported API")
        .to_string();

    // Get base URL from servers
    let base_url = root
        .get("servers")
        .and_then(|s| s.as_array())
        .and_then(|arr| arr.first())
        .and_then(|s| s.get("url"))
        .and_then(|v| v.as_str())
        .unwrap_or("{{baseUrl}}")
        .to_string();

    let paths = root.get("paths").and_then(|v| v.as_object());

    // Group requests by tag → folder
    let mut tag_folders: HashMap<String, Vec<ImportItem>> = HashMap::new();
    let mut untagged = Vec::new();

    if let Some(paths) = paths {
        for (path, methods) in paths {
            let methods_obj = match methods.as_object() {
                Some(m) => m,
                None => continue,
            };

            for (method, operation) in methods_obj {
                let method_upper = method.to_uppercase();
                // Skip non-method keys like "parameters", "summary"
                if !matches!(
                    method_upper.as_str(),
                    "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
                ) {
                    continue;
                }

                let op_id = operation
                    .get("operationId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let summary = operation
                    .get("summary")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let description = operation
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let name = if !summary.is_empty() {
                    summary.to_string()
                } else if !op_id.is_empty() {
                    op_id.to_string()
                } else {
                    format!("{method_upper} {path}")
                };

                let url = format!("{}{}", base_url.trim_end_matches('/'), path);

                // Parse parameters (header + query)
                let mut headers = HashMap::new();
                let mut params_in_url = Vec::new();
                if let Some(params) = operation.get("parameters").and_then(|v| v.as_array()) {
                    for param in params {
                        let param_name = param.get("name").and_then(|v| v.as_str()).unwrap_or("");
                        let param_in = param.get("in").and_then(|v| v.as_str()).unwrap_or("");

                        let example_val = param
                            .get("example")
                            .and_then(|v| v.as_str())
                            .or_else(|| {
                                param
                                    .get("schema")
                                    .and_then(|s| s.get("default"))
                                    .and_then(|v| v.as_str())
                            })
                            .unwrap_or("")
                            .to_string();

                        match param_in {
                            "header" => {
                                headers.insert(param_name.to_string(), example_val);
                            }
                            "query" => {
                                params_in_url.push(format!("{param_name}={example_val}"));
                            }
                            _ => {}
                        }
                    }
                }

                // Append query params to URL if any
                let final_url = if params_in_url.is_empty() {
                    url
                } else {
                    format!("{}?{}", url, params_in_url.join("&"))
                };

                // Parse request body
                let body =
                    parse_request_body(operation.get("requestBody"), &root, &name, &mut warnings);

                let item = ImportItem::Request {
                    name: name.clone(),
                    method: method_upper,
                    url: final_url,
                    headers,
                    body: Box::new(body),
                    auth: Box::new(None),
                    description,
                    pre_request_script: None,
                    post_response_script: None,
                    tests: None,
                };

                // Group by first tag
                let tag = operation
                    .get("tags")
                    .and_then(|t| t.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|v| v.as_str());

                if let Some(tag) = tag {
                    tag_folders.entry(tag.to_string()).or_default().push(item);
                } else {
                    untagged.push(item);
                }
            }
        }
    }

    // Build items: folders from tags + untagged at root
    let mut items: Vec<ImportItem> = tag_folders
        .into_iter()
        .map(|(tag, reqs)| ImportItem::Folder {
            name: tag,
            items: reqs,
        })
        .collect();
    items.extend(untagged);

    // Create environment with baseUrl
    let mut env_vars = HashMap::new();
    if base_url != "{{baseUrl}}" {
        env_vars.insert("baseUrl".to_string(), base_url);
    }
    let environments = if env_vars.is_empty() {
        Vec::new()
    } else {
        vec![ImportEnvironment {
            name: "Default".to_string(),
            variables: env_vars,
        }]
    };

    Ok(ImportData {
        collection_name: title,
        items,
        environments,
        warnings,
    })
}

fn parse_request_body(
    body_val: Option<&Value>,
    root: &Value,
    request_name: &str,
    warnings: &mut Vec<ImportWarning>,
) -> Option<ImportBody> {
    let body = body_val?;
    let content = body.get("content").and_then(|v| v.as_object())?;

    // Try JSON first, then other types
    if let Some(json_content) = content.get("application/json") {
        let example = extract_example(json_content, root);
        if !example.is_empty() {
            return Some(ImportBody {
                body_type: "json".to_string(),
                content: example,
            });
        }
        // No example — try to generate from schema
        if let Some(schema) = json_content.get("schema") {
            let generated = generate_example_from_schema(schema, root);
            if !generated.is_empty() {
                return Some(ImportBody {
                    body_type: "json".to_string(),
                    content: generated,
                });
            }
        }
        warnings.push(ImportWarning {
            item_name: request_name.to_string(),
            message: "Request body schema found but no example could be generated.".to_string(),
        });
        return None;
    }

    if let Some(xml_content) = content.get("application/xml").or(content.get("text/xml")) {
        let example = extract_example(xml_content, root);
        if !example.is_empty() {
            return Some(ImportBody {
                body_type: "xml".to_string(),
                content: example,
            });
        }
    }

    if let Some(form_content) = content.get("application/x-www-form-urlencoded") {
        let example = extract_example(form_content, root);
        if !example.is_empty() {
            return Some(ImportBody {
                body_type: "urlencoded".to_string(),
                content: example,
            });
        }
    }

    None
}

fn extract_example(media_type: &Value, _root: &Value) -> String {
    // Direct example
    if let Some(example) = media_type.get("example") {
        return serde_json::to_string_pretty(example).unwrap_or_default();
    }
    // examples → first one
    if let Some(examples) = media_type.get("examples").and_then(|v| v.as_object()) {
        if let Some(first) = examples.values().next() {
            if let Some(value) = first.get("value") {
                return serde_json::to_string_pretty(value).unwrap_or_default();
            }
        }
    }
    String::new()
}

/// Generate a sample JSON object from an OpenAPI schema (best-effort).
fn generate_example_from_schema(schema: &Value, root: &Value) -> String {
    let value = schema_to_value(schema, root, 0);
    serde_json::to_string_pretty(&value).unwrap_or_default()
}

fn schema_to_value(schema: &Value, root: &Value, depth: usize) -> Value {
    if depth > 5 {
        return Value::Null;
    }

    // Handle $ref
    if let Some(ref_path) = schema.get("$ref").and_then(|v| v.as_str()) {
        if let Some(resolved) = resolve_ref(ref_path, root) {
            return schema_to_value(resolved, root, depth + 1);
        }
        return Value::Null;
    }

    let schema_type = schema.get("type").and_then(|v| v.as_str()).unwrap_or("");

    // If there's a default or example, use it
    if let Some(example) = schema.get("example") {
        return example.clone();
    }
    if let Some(default) = schema.get("default") {
        return default.clone();
    }

    match schema_type {
        "object" => {
            let mut obj = serde_json::Map::new();
            if let Some(props) = schema.get("properties").and_then(|v| v.as_object()) {
                for (key, prop_schema) in props {
                    obj.insert(key.clone(), schema_to_value(prop_schema, root, depth + 1));
                }
            }
            Value::Object(obj)
        }
        "array" => {
            if let Some(items) = schema.get("items") {
                Value::Array(vec![schema_to_value(items, root, depth + 1)])
            } else {
                Value::Array(vec![])
            }
        }
        "string" => {
            let format = schema.get("format").and_then(|v| v.as_str()).unwrap_or("");
            match format {
                "email" => Value::String("user@example.com".to_string()),
                "date-time" => Value::String("2024-01-01T00:00:00Z".to_string()),
                "date" => Value::String("2024-01-01".to_string()),
                "uri" | "url" => Value::String("https://example.com".to_string()),
                "uuid" => Value::String("550e8400-e29b-41d4-a716-446655440000".to_string()),
                _ => Value::String("string".to_string()),
            }
        }
        "integer" => Value::Number(serde_json::Number::from(0)),
        "number" => serde_json::to_value(0.0).unwrap_or(Value::Null),
        "boolean" => Value::Bool(false),
        _ => Value::Null,
    }
}

fn resolve_ref<'a>(ref_path: &str, root: &'a Value) -> Option<&'a Value> {
    // #/components/schemas/User → ["components", "schemas", "User"]
    let path = ref_path.strip_prefix("#/")?;
    let parts: Vec<&str> = path.split('/').collect();
    let mut current = root;
    for part in parts {
        current = current.get(part)?;
    }
    Some(current)
}
