use serde_json::Value;

use super::{AssertionResult, ResponseSnapshot};

/// Evaluate declarative assertions from a YAML `assert` block against a response.
///
/// The assertions block is a YAML mapping like:
/// ```yaml
/// assert:
///   status: 200
///   body.users.length: { gt: 0 }
///   headers.content-type: { contains: "application/json" }
///   responseTime: { lt: 2000 }
/// ```
pub fn evaluate_assertions(
    assert_value: &serde_yaml::Value,
    response: &ResponseSnapshot,
) -> Vec<AssertionResult> {
    let mut results = Vec::new();

    let mapping = match assert_value.as_mapping() {
        Some(m) => m,
        None => return results,
    };

    // Build the response as a JSON value for dot-path resolution
    let response_json = build_response_json(response);

    for (key, value) in mapping {
        let path = match key.as_str() {
            Some(s) => s.to_string(),
            None => continue,
        };

        let actual = resolve_path(&path, &response_json, response);

        // Value can be a simple scalar (shorthand for eq) or an object with operator keys
        if let Some(obj) = value.as_mapping() {
            for (op_key, op_value) in obj {
                let operator = match op_key.as_str() {
                    Some(s) => s,
                    None => continue,
                };
                let expected = yaml_to_json(op_value);
                let passed = evaluate_operator(operator, &actual, &expected);
                results.push(AssertionResult {
                    path: path.clone(),
                    operator: operator.to_string(),
                    expected: expected.clone(),
                    actual: actual.clone(),
                    passed,
                });
            }
        } else {
            // Shorthand: `status: 200` means `status: { eq: 200 }`
            let expected = yaml_to_json(value);
            let passed = evaluate_operator("eq", &actual, &expected);
            results.push(AssertionResult {
                path,
                operator: "eq".to_string(),
                expected,
                actual,
                passed,
            });
        }
    }

    results
}

/// Build a JSON representation of the response for path resolution
fn build_response_json(response: &ResponseSnapshot) -> Value {
    let mut headers_map = serde_json::Map::new();
    for (k, v) in &response.headers {
        headers_map.insert(k.to_lowercase(), Value::String(v.clone()));
    }

    let body_value =
        serde_json::from_str(&response.body).unwrap_or(Value::String(response.body.clone()));

    let mut root = serde_json::Map::new();
    root.insert("status".to_string(), Value::Number(response.status.into()));
    root.insert(
        "statusText".to_string(),
        Value::String(response.status_text.clone()),
    );
    root.insert("headers".to_string(), Value::Object(headers_map));
    root.insert("body".to_string(), body_value);
    root.insert(
        "responseTime".to_string(),
        Value::Number(response.time_ms.into()),
    );
    root.insert(
        "sizeBytes".to_string(),
        Value::Number(response.size_bytes.into()),
    );

    Value::Object(root)
}

/// Resolve a dot-path like `body.users[0].email` against a JSON value
fn resolve_path(path: &str, root: &Value, response: &ResponseSnapshot) -> Value {
    // Handle special top-level paths
    match path {
        "status" => return Value::Number(response.status.into()),
        "responseTime" => return Value::Number(response.time_ms.into()),
        "sizeBytes" => return Value::Number(response.size_bytes.into()),
        "statusText" => return Value::String(response.status_text.clone()),
        _ => {}
    }

    let segments = parse_path_segments(path);
    let mut current = root.clone();

    for segment in &segments {
        current = match segment {
            PathSegment::Key(key) => {
                // Case-insensitive header lookup
                if let Value::Object(map) = &current {
                    let lower_key = key.to_lowercase();
                    map.get(key)
                        .or_else(|| map.get(&lower_key))
                        .cloned()
                        .unwrap_or(Value::Null)
                } else {
                    Value::Null
                }
            }
            PathSegment::Index(idx) => {
                if let Value::Array(arr) = &current {
                    arr.get(*idx).cloned().unwrap_or(Value::Null)
                } else {
                    Value::Null
                }
            }
            PathSegment::Length => match &current {
                Value::Array(arr) => Value::Number(arr.len().into()),
                Value::String(s) => Value::Number(s.len().into()),
                _ => Value::Null,
            },
        };
    }

    current
}

#[derive(Debug)]
enum PathSegment {
    Key(String),
    Index(usize),
    Length,
}

/// Parse a path string like `body.users[0].email` into segments
fn parse_path_segments(path: &str) -> Vec<PathSegment> {
    let mut segments = Vec::new();
    let mut current = String::new();

    let chars: Vec<char> = path.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        match chars[i] {
            '.' => {
                if !current.is_empty() {
                    push_segment(&mut segments, &current);
                    current.clear();
                }
            }
            '[' => {
                if !current.is_empty() {
                    push_segment(&mut segments, &current);
                    current.clear();
                }
                // Read until ']'
                i += 1;
                let mut index_str = String::new();
                while i < chars.len() && chars[i] != ']' {
                    index_str.push(chars[i]);
                    i += 1;
                }
                if let Ok(idx) = index_str.parse::<usize>() {
                    segments.push(PathSegment::Index(idx));
                }
            }
            c => {
                current.push(c);
            }
        }
        i += 1;
    }

    if !current.is_empty() {
        push_segment(&mut segments, &current);
    }

    segments
}

fn push_segment(segments: &mut Vec<PathSegment>, key: &str) {
    if key == "length" {
        segments.push(PathSegment::Length);
    } else {
        segments.push(PathSegment::Key(key.to_string()));
    }
}

/// Evaluate a single assertion operator
fn evaluate_operator(operator: &str, actual: &Value, expected: &Value) -> bool {
    match operator {
        "eq" => values_equal(actual, expected),
        "neq" => !values_equal(actual, expected),
        "gt" => compare_numbers(actual, expected, |a, b| a > b),
        "gte" => compare_numbers(actual, expected, |a, b| a >= b),
        "lt" => compare_numbers(actual, expected, |a, b| a < b),
        "lte" => compare_numbers(actual, expected, |a, b| a <= b),
        "in" => {
            if let Value::Array(arr) = expected {
                arr.iter().any(|item| values_equal(actual, item))
            } else {
                false
            }
        }
        "notIn" => {
            if let Value::Array(arr) = expected {
                !arr.iter().any(|item| values_equal(actual, item))
            } else {
                true
            }
        }
        "contains" => {
            let actual_str = value_to_string(actual);
            let expected_str = value_to_string(expected);
            actual_str.contains(&expected_str)
        }
        "notContains" => {
            let actual_str = value_to_string(actual);
            let expected_str = value_to_string(expected);
            !actual_str.contains(&expected_str)
        }
        "matches" => {
            let actual_str = value_to_string(actual);
            let pattern = value_to_string(expected);
            regex::Regex::new(&pattern)
                .map(|re| re.is_match(&actual_str))
                .unwrap_or(false)
        }
        "type" => {
            let expected_type = value_to_string(expected);
            let actual_type = json_type_name(actual);
            actual_type == expected_type
        }
        "exists" => {
            let should_exist = expected.as_bool().unwrap_or(true);
            let does_exist = !actual.is_null();
            does_exist == should_exist
        }
        "length" => {
            let expected_len = expected.as_u64();
            let actual_len = match actual {
                Value::Array(arr) => Some(arr.len() as u64),
                Value::String(s) => Some(s.len() as u64),
                _ => None,
            };
            expected_len.is_some() && actual_len == expected_len
        }
        _ => false,
    }
}

fn values_equal(a: &Value, b: &Value) -> bool {
    // Numeric comparison: handle int/float mismatches
    if let (Some(a_num), Some(b_num)) = (a.as_f64(), b.as_f64()) {
        return (a_num - b_num).abs() < f64::EPSILON;
    }
    a == b
}

fn compare_numbers(actual: &Value, expected: &Value, cmp: fn(f64, f64) -> bool) -> bool {
    match (actual.as_f64(), expected.as_f64()) {
        (Some(a), Some(b)) => cmp(a, b),
        _ => false,
    }
}

fn value_to_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        _ => v.to_string(),
    }
}

fn json_type_name(v: &Value) -> String {
    match v {
        Value::String(_) => "string".to_string(),
        Value::Number(_) => "number".to_string(),
        Value::Bool(_) => "boolean".to_string(),
        Value::Array(_) => "array".to_string(),
        Value::Object(_) => "object".to_string(),
        Value::Null => "null".to_string(),
    }
}

/// Convert serde_yaml::Value to serde_json::Value
fn yaml_to_json(v: &serde_yaml::Value) -> Value {
    match v {
        serde_yaml::Value::Null => Value::Null,
        serde_yaml::Value::Bool(b) => Value::Bool(*b),
        serde_yaml::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Value::Number(i.into())
            } else if let Some(u) = n.as_u64() {
                Value::Number(u.into())
            } else if let Some(f) = n.as_f64() {
                serde_json::Number::from_f64(f)
                    .map(Value::Number)
                    .unwrap_or(Value::Null)
            } else {
                Value::Null
            }
        }
        serde_yaml::Value::String(s) => Value::String(s.clone()),
        serde_yaml::Value::Sequence(seq) => Value::Array(seq.iter().map(yaml_to_json).collect()),
        serde_yaml::Value::Mapping(map) => {
            let obj: serde_json::Map<String, Value> = map
                .iter()
                .filter_map(|(k, v)| {
                    let key = k.as_str()?.to_string();
                    Some((key, yaml_to_json(v)))
                })
                .collect();
            Value::Object(obj)
        }
        serde_yaml::Value::Tagged(tagged) => yaml_to_json(&tagged.value),
    }
}

// Re-export for use in commands
pub fn evaluate_assertions_from_yaml(
    yaml_value: &serde_yaml::Value,
    response: &ResponseSnapshot,
) -> Vec<AssertionResult> {
    evaluate_assertions(yaml_value, response)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    fn make_response(status: u16, body: &str, time_ms: u64) -> ResponseSnapshot {
        ResponseSnapshot {
            status,
            status_text: if status == 200 {
                "OK".to_string()
            } else {
                "Error".to_string()
            },
            headers: {
                let mut h = HashMap::new();
                h.insert("content-type".to_string(), "application/json".to_string());
                h.insert("x-request-id".to_string(), "abc123".to_string());
                h
            },
            body: body.to_string(),
            time_ms,
            size_bytes: body.len() as u64,
        }
    }

    fn parse_yaml_assert(yaml: &str) -> serde_yaml::Value {
        serde_yaml::from_str(yaml).unwrap()
    }

    #[test]
    fn test_status_shorthand() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("status: 200");
        let results = evaluate_assertions(&yaml, &resp);
        assert_eq!(results.len(), 1);
        assert!(results[0].passed);
        assert_eq!(results[0].operator, "eq");
    }

    #[test]
    fn test_status_failure() {
        let resp = make_response(404, "{}", 100);
        let yaml = parse_yaml_assert("status: 200");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(!results[0].passed);
    }

    #[test]
    fn test_response_time_lt() {
        let resp = make_response(200, "{}", 150);
        let yaml = parse_yaml_assert("responseTime:\n  lt: 2000");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_response_time_gt_fails() {
        let resp = make_response(200, "{}", 150);
        let yaml = parse_yaml_assert("responseTime:\n  gt: 1000");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(!results[0].passed);
    }

    #[test]
    fn test_body_dot_path() {
        let resp = make_response(200, r#"{"id": 42, "name": "test"}"#, 100);
        let yaml = parse_yaml_assert("body.id:\n  eq: 42");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_nested_body_path() {
        let resp = make_response(
            200,
            r#"{"data": {"user": {"email": "test@example.com"}}}"#,
            100,
        );
        let yaml = parse_yaml_assert("body.data.user.email:\n  eq: \"test@example.com\"");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_array_index() {
        let resp = make_response(
            200,
            r#"{"users": [{"name": "Alice"}, {"name": "Bob"}]}"#,
            100,
        );
        let yaml = parse_yaml_assert("body.users[0].name:\n  eq: Alice");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_array_length() {
        let resp = make_response(200, r#"{"users": [1, 2, 3]}"#, 100);
        let yaml = parse_yaml_assert("body.users.length:\n  eq: 3");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_header_contains() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("headers.content-type:\n  contains: application/json");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_header_case_insensitive() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("headers.Content-Type:\n  contains: json");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_matches_regex() {
        let resp = make_response(200, r#"{"email": "test@example.com"}"#, 100);
        let yaml = parse_yaml_assert("body.email:\n  matches: \"^.+@.+\\\\..+$\"");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_type_operator() {
        let resp = make_response(200, r#"{"count": 42, "name": "test", "active": true}"#, 100);
        let yaml = parse_yaml_assert("body.count:\n  type: number");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_exists_operator() {
        let resp = make_response(200, r#"{"id": 1}"#, 100);
        let yaml = parse_yaml_assert("body.id:\n  exists: true");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_in_operator() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("status:\n  in:\n    - 200\n    - 201\n    - 204");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_not_in_operator() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("status:\n  notIn:\n    - 400\n    - 500");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_neq_operator() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("status:\n  neq: 500");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_gte_lte() {
        let resp = make_response(200, "{}", 150);
        let yaml = parse_yaml_assert("responseTime:\n  gte: 100\n  lte: 200");
        let results = evaluate_assertions(&yaml, &resp);
        assert_eq!(results.len(), 2);
        assert!(results[0].passed);
        assert!(results[1].passed);
    }

    #[test]
    fn test_not_contains() {
        let resp = make_response(200, "{}", 100);
        let yaml = parse_yaml_assert("headers.content-type:\n  notContains: xml");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_length_operator() {
        let resp = make_response(200, r#"{"items": [1, 2, 3, 4, 5]}"#, 100);
        let yaml = parse_yaml_assert("body.items:\n  length: 5");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }

    #[test]
    fn test_multiple_assertions() {
        let resp = make_response(200, r#"{"id": 1}"#, 100);
        let yaml = parse_yaml_assert(
            "status: 200\nresponseTime:\n  lt: 2000\nbody.id:\n  eq: 1\n  type: number",
        );
        let results = evaluate_assertions(&yaml, &resp);
        assert_eq!(results.len(), 4);
        assert!(results.iter().all(|r| r.passed));
    }

    #[test]
    fn test_null_path_returns_null() {
        let resp = make_response(200, r#"{"id": 1}"#, 100);
        let yaml = parse_yaml_assert("body.nonexistent:\n  exists: false");
        let results = evaluate_assertions(&yaml, &resp);
        assert!(results[0].passed);
    }
}
