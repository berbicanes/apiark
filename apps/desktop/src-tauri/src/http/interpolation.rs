use std::collections::HashMap;

use regex::Regex;

/// Interpolate `{{variable}}` references in a string.
/// Resolves user variables first, then dynamic variables like `{{$uuid}}`.
pub fn interpolate(input: &str, variables: &HashMap<String, String>) -> String {
    let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let var_name = caps[1].trim();
        // Check user variables first
        if let Some(value) = variables.get(var_name) {
            return value.clone();
        }
        // Check dynamic variables
        if let Some(value) = resolve_dynamic(var_name) {
            return value;
        }
        // Leave unresolved variables as-is
        caps[0].to_string()
    })
    .to_string()
}

/// Resolve built-in dynamic variables like `$uuid`, `$timestamp`, etc.
fn resolve_dynamic(name: &str) -> Option<String> {
    match name {
        "$uuid" => Some(uuid::Uuid::new_v4().to_string()),
        "$timestamp" => Some(chrono::Utc::now().timestamp().to_string()),
        "$timestampMs" => Some(chrono::Utc::now().timestamp_millis().to_string()),
        "$isoTimestamp" => Some(chrono::Utc::now().to_rfc3339()),
        "$randomInt" => Some(
            rand::random::<u32>()
                .to_string()
                .chars()
                .take(4)
                .collect::<String>()
                .parse::<u32>()
                .map(|v| (v % 1001).to_string())
                .unwrap_or_else(|_| "0".to_string()),
        ),
        "$randomFloat" => {
            let val: f64 = rand::random();
            Some(format!("{:.6}", val))
        }
        "$randomString" => {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            let s: String = (0..16)
                .map(|_| {
                    let idx = rng.gen_range(0..36);
                    if idx < 10 {
                        (b'0' + idx) as char
                    } else {
                        (b'a' + idx - 10) as char
                    }
                })
                .collect();
            Some(s)
        }
        "$randomEmail" => {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            let user: String = (0..8)
                .map(|_| (b'a' + rng.gen_range(0..26)) as char)
                .collect();
            Some(format!("{user}@example.com"))
        }
        _ => None,
    }
}

/// Interpolate all fields of a HashMap<String, String>.
pub fn interpolate_map(
    map: &HashMap<String, String>,
    variables: &HashMap<String, String>,
) -> HashMap<String, String> {
    map.iter()
        .map(|(k, v)| (interpolate(k, variables), interpolate(v, variables)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_interpolation() {
        let mut vars = HashMap::new();
        vars.insert("baseUrl".to_string(), "http://localhost:3000".to_string());
        vars.insert("token".to_string(), "abc123".to_string());

        assert_eq!(
            interpolate("{{baseUrl}}/api/users", &vars),
            "http://localhost:3000/api/users"
        );
        assert_eq!(interpolate("Bearer {{token}}", &vars), "Bearer abc123");
    }

    #[test]
    fn test_unresolved_left_as_is() {
        let vars = HashMap::new();
        assert_eq!(interpolate("{{unknown}}", &vars), "{{unknown}}");
    }

    #[test]
    fn test_dynamic_uuid() {
        let vars = HashMap::new();
        let result = interpolate("{{$uuid}}", &vars);
        assert_ne!(result, "{{$uuid}}");
        assert_eq!(result.len(), 36); // UUID v4 format
    }
}
