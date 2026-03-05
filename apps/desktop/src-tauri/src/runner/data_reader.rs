use std::collections::HashMap;
use std::path::Path;

/// Read a data file (CSV, JSON, or YAML) into rows of key-value pairs.
pub fn read_data_file(path: &str) -> Result<Vec<HashMap<String, String>>, String> {
    let path = Path::new(path);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "csv" => read_csv(path),
        "json" => read_json(path),
        "yaml" | "yml" => read_yaml(path),
        _ => Err(format!(
            "Unsupported data file format: .{ext}. Use .csv, .json, or .yaml"
        )),
    }
}

fn read_csv(path: &Path) -> Result<Vec<HashMap<String, String>>, String> {
    let mut reader =
        csv::Reader::from_path(path).map_err(|e| format!("Failed to read CSV file: {e}"))?;

    let headers = reader
        .headers()
        .map_err(|e| format!("Failed to read CSV headers: {e}"))?
        .clone();

    let mut rows = Vec::new();
    for result in reader.records() {
        let record = result.map_err(|e| format!("CSV parse error: {e}"))?;
        let mut row = HashMap::new();
        for (i, field) in record.iter().enumerate() {
            if let Some(header) = headers.get(i) {
                row.insert(header.to_string(), field.to_string());
            }
        }
        rows.push(row);
    }

    Ok(rows)
}

fn read_json(path: &Path) -> Result<Vec<HashMap<String, String>>, String> {
    let content =
        std::fs::read_to_string(path).map_err(|e| format!("Failed to read JSON file: {e}"))?;

    let value: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {e}"))?;

    match value {
        serde_json::Value::Array(arr) => {
            let mut rows = Vec::new();
            for item in arr {
                if let serde_json::Value::Object(obj) = item {
                    let row: HashMap<String, String> = obj
                        .into_iter()
                        .map(|(k, v)| {
                            let s = match v {
                                serde_json::Value::String(s) => s,
                                other => other.to_string(),
                            };
                            (k, s)
                        })
                        .collect();
                    rows.push(row);
                }
            }
            Ok(rows)
        }
        _ => Err("JSON data file must be an array of objects".to_string()),
    }
}

fn read_yaml(path: &Path) -> Result<Vec<HashMap<String, String>>, String> {
    let content =
        std::fs::read_to_string(path).map_err(|e| format!("Failed to read YAML file: {e}"))?;

    let value: serde_yaml::Value =
        serde_yaml::from_str(&content).map_err(|e| format!("Invalid YAML: {e}"))?;

    match value {
        serde_yaml::Value::Sequence(seq) => {
            let mut rows = Vec::new();
            for item in seq {
                if let serde_yaml::Value::Mapping(map) = item {
                    let row: HashMap<String, String> = map
                        .into_iter()
                        .filter_map(|(k, v)| {
                            let key = match k {
                                serde_yaml::Value::String(s) => s,
                                _ => return None,
                            };
                            let val = match v {
                                serde_yaml::Value::String(s) => s,
                                serde_yaml::Value::Number(n) => n.to_string(),
                                serde_yaml::Value::Bool(b) => b.to_string(),
                                other => format!("{other:?}"),
                            };
                            Some((key, val))
                        })
                        .collect();
                    rows.push(row);
                }
            }
            Ok(rows)
        }
        _ => Err("YAML data file must be a sequence of mappings".to_string()),
    }
}
