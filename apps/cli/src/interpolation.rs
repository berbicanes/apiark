use regex::Regex;
use std::collections::HashMap;

/// Interpolate `{{variable}}` references in a string.
pub fn interpolate(input: &str, variables: &HashMap<String, String>) -> String {
    let re = Regex::new(r"\{\{([^}]+)\}\}").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let var_name = caps[1].trim();
        if let Some(value) = variables.get(var_name) {
            return value.clone();
        }
        if let Some(value) = resolve_dynamic(var_name) {
            return value;
        }
        caps[0].to_string()
    })
    .to_string()
}

fn resolve_dynamic(name: &str) -> Option<String> {
    match name {
        "$uuid" => Some(uuid::Uuid::new_v4().to_string()),
        "$timestamp" => Some(chrono::Utc::now().timestamp().to_string()),
        "$timestampMs" => Some(chrono::Utc::now().timestamp_millis().to_string()),
        "$isoTimestamp" => Some(chrono::Utc::now().to_rfc3339()),
        "$randomInt" => {
            let val: u32 = rand::random::<u32>() % 1001;
            Some(val.to_string())
        }
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
