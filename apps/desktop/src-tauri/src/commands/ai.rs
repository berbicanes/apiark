use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerateParams {
    pub prompt: String,
    pub context: Option<String>,
    pub api_key: String,
    pub endpoint: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGeneratedRequest {
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGeneratedTests {
    pub tests: String,
    pub assertions: Option<String>,
}

/// Generate an API request from natural language using an OpenAI-compatible API.
#[tauri::command]
pub async fn ai_generate_request(params: AiGenerateParams) -> Result<AiGeneratedRequest, String> {
    let system_prompt = r#"You are an API development assistant. Given a natural language description, generate an HTTP API request.
Respond with a JSON object containing exactly these fields:
- "name": short descriptive name for the request
- "method": HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- "url": full URL with any path parameters as {{variableName}}
- "headers": object of header key-value pairs (include Content-Type if needed)
- "body": request body string (JSON for POST/PUT/PATCH, null for GET/DELETE)
- "bodyType": "json", "form-data", "urlencoded", "raw", or null
- "description": brief description of what the request does

Only respond with the JSON object, no other text."#;

    let mut messages = vec![serde_json::json!({ "role": "system", "content": system_prompt })];

    if let Some(ctx) = &params.context {
        messages.push(serde_json::json!({
            "role": "system",
            "content": format!("Context about the API:\n{ctx}")
        }));
    }

    messages.push(serde_json::json!({
        "role": "user",
        "content": params.prompt
    }));

    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "{}/chat/completions",
            params.endpoint.trim_end_matches('/')
        ))
        .header("Authorization", format!("Bearer {}", params.api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": params.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1000,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to call AI API: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("AI API returned {status}: {body}"));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse AI response: {e}"))?;

    let content = body
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or("Invalid AI response format")?;

    // Parse the JSON from the response (strip markdown code blocks if present)
    let json_str = content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let generated: AiGeneratedRequest = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse generated request: {e}\nRaw: {json_str}"))?;

    Ok(generated)
}

/// Generate test assertions from a request/response pair using an OpenAI-compatible API.
#[tauri::command]
pub async fn ai_generate_tests(
    params: AiGenerateParams,
    request_yaml: String,
    response_body: String,
    response_status: u16,
) -> Result<AiGeneratedTests, String> {
    let system_prompt = r#"You are an API testing assistant. Given an API request and its response, generate test assertions.
Respond with a JSON object containing:
- "tests": JavaScript test code using the ark.test() and ark.expect() API (similar to Chai.js)
- "assertions": YAML assertion block (optional, for declarative assertions)

Example test code:
ark.test("should return 200", () => {
  ark.expect(ark.response.status).to.equal(200);
});
ark.test("should have users array", () => {
  const body = ark.response.json();
  ark.expect(body).to.have.property("users");
  ark.expect(body.users).to.be.an("array");
});

Example YAML assertions:
status: 200
body.users.length: { gt: 0 }
headers.content-type: { contains: "application/json" }
responseTime: { lt: 2000 }

Only respond with the JSON object, no other text."#;

    let user_content = format!(
        "Request:\n```yaml\n{request_yaml}\n```\n\nResponse status: {response_status}\nResponse body:\n```\n{}\n```",
        if response_body.len() > 5000 { &response_body[..5000] } else { &response_body }
    );

    let messages = vec![
        serde_json::json!({ "role": "system", "content": system_prompt }),
        serde_json::json!({ "role": "user", "content": user_content }),
    ];

    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "{}/chat/completions",
            params.endpoint.trim_end_matches('/')
        ))
        .header("Authorization", format!("Bearer {}", params.api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": params.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1500,
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to call AI API: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("AI API returned {status}: {body}"));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse AI response: {e}"))?;

    let content = body
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or("Invalid AI response format")?;

    let json_str = content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let generated: AiGeneratedTests = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse generated tests: {e}\nRaw: {json_str}"))?;

    Ok(generated)
}
