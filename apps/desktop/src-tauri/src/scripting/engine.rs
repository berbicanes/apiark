use std::collections::HashMap;

use rquickjs::{Context, Runtime};

use super::{ConsoleEntry, RequestSnapshot, ScriptContext, ScriptPhase, ScriptResult, TestResult};

const ARK_API_JS: &str = include_str!("ark_api.js");

/// Execute a user script in an isolated QuickJS context.
///
/// The ark API is injected before the user script. After execution,
/// mutations (env/globals/variables changes, test results, console output)
/// are extracted from the JS context and returned as a `ScriptResult`.
pub fn execute_script(
    code: &str,
    context: ScriptContext,
    phase: ScriptPhase,
) -> Result<ScriptResult, String> {
    let rt = Runtime::new().map_err(|e| format!("Failed to create JS runtime: {e}"))?;
    // Limit memory to 32MB and max stack size to 1MB
    rt.set_memory_limit(32 * 1024 * 1024);
    rt.set_max_stack_size(1024 * 1024);

    let ctx = Context::full(&rt).map_err(|e| format!("Failed to create JS context: {e}"))?;

    let ctx_json =
        serde_json::to_string(&context).map_err(|e| format!("Failed to serialize context: {e}"))?;

    let phase_str = match phase {
        ScriptPhase::PreRequest => "pre_request",
        ScriptPhase::PostResponse => "post_response",
    };

    ctx.with(|ctx| {
        let globals = ctx.globals();

        // Inject context JSON and phase as globals
        globals
            .set("__ctx_json", ctx_json)
            .map_err(|e| format!("Failed to set __ctx_json: {e}"))?;
        globals
            .set("__phase_str", phase_str)
            .map_err(|e| format!("Failed to set __phase_str: {e}"))?;

        // Execute ark API setup
        ctx.eval::<(), _>(ARK_API_JS)
            .map_err(|e| format!("Failed to initialize ark API: {e}"))?;

        // Execute user script
        ctx.eval::<(), _>(code)
            .map_err(|e| format!("Script error: {e}"))?;

        // Extract mutations by serializing __mutations to JSON
        let result_json: String = ctx
            .eval("JSON.stringify(__mutations)")
            .map_err(|e| format!("Failed to extract results: {e}"))?;

        parse_mutations(&result_json, &context)
    })
}

/// Parse the __mutations JSON from JS back into a ScriptResult
fn parse_mutations(json: &str, original_ctx: &ScriptContext) -> Result<ScriptResult, String> {
    let raw: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("Failed to parse mutations JSON: {e}"))?;

    // Extract env mutations
    let env_mutations = extract_store_mutations(raw.get("env"));
    let global_mutations = extract_store_mutations(raw.get("globals"));
    let variable_mutations = extract_store_mutations(raw.get("variables"));

    // Extract test results
    let test_results = raw
        .get("tests")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|t| {
                    Some(TestResult {
                        name: t.get("name")?.as_str()?.to_string(),
                        passed: t.get("passed")?.as_bool()?,
                        error: t
                            .get("error")
                            .and_then(|e| e.as_str())
                            .map(|s| s.to_string()),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    // Extract console output
    let console_output = raw
        .get("console")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|c| {
                    Some(ConsoleEntry {
                        level: c.get("level")?.as_str()?.to_string(),
                        message: c.get("message")?.as_str()?.to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    // Extract request mutations
    let request = if let Some(req) = raw.get("request") {
        RequestSnapshot {
            method: req
                .get("method")
                .and_then(|v| v.as_str())
                .unwrap_or(&original_ctx.request.method)
                .to_string(),
            url: req
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or(&original_ctx.request.url)
                .to_string(),
            headers: req
                .get("headers")
                .and_then(|v| v.as_object())
                .map(|obj| {
                    obj.iter()
                        .filter_map(|(k, v)| Some((k.clone(), v.as_str()?.to_string())))
                        .collect()
                })
                .unwrap_or_else(|| original_ctx.request.headers.clone()),
            body: req
                .get("body")
                .map(|v| {
                    if v.is_null() {
                        None
                    } else {
                        v.as_str().map(|s| s.to_string())
                    }
                })
                .unwrap_or_else(|| original_ctx.request.body.clone()),
        }
    } else {
        original_ctx.request.clone()
    };

    Ok(ScriptResult {
        request,
        env_mutations,
        global_mutations,
        variable_mutations,
        test_results,
        console_output,
    })
}

fn extract_store_mutations(value: Option<&serde_json::Value>) -> HashMap<String, Option<String>> {
    value
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .map(|(k, v)| {
                    let val = if v.is_null() {
                        None
                    } else {
                        Some(v.as_str().unwrap_or("").to_string())
                    };
                    (k.clone(), val)
                })
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_context() -> ScriptContext {
        ScriptContext {
            request: RequestSnapshot {
                method: "GET".to_string(),
                url: "https://example.com".to_string(),
                headers: HashMap::new(),
                body: None,
            },
            response: None,
            env: HashMap::new(),
            globals: HashMap::new(),
            variables: HashMap::new(),
        }
    }

    fn context_with_response() -> ScriptContext {
        let mut ctx = empty_context();
        ctx.response = Some(super::super::ResponseSnapshot {
            status: 200,
            status_text: "OK".to_string(),
            headers: {
                let mut h = HashMap::new();
                h.insert("content-type".to_string(), "application/json".to_string());
                h
            },
            body: r#"{"id": 1, "name": "Test"}"#.to_string(),
            time_ms: 150,
            size_bytes: 1024,
        });
        ctx
    }

    #[test]
    fn test_simple_script() {
        let ctx = empty_context();
        let result = execute_script("var x = 1 + 1;", ctx, ScriptPhase::PreRequest).unwrap();
        assert!(result.test_results.is_empty());
        assert!(result.console_output.is_empty());
    }

    #[test]
    fn test_console_output() {
        let ctx = empty_context();
        let result = execute_script(
            r#"console.log("hello", "world"); console.warn("warning");"#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(result.console_output.len(), 2);
        assert_eq!(result.console_output[0].level, "log");
        assert_eq!(result.console_output[0].message, "hello world");
        assert_eq!(result.console_output[1].level, "warn");
    }

    #[test]
    fn test_env_mutations() {
        let ctx = empty_context();
        let result = execute_script(
            r#"ark.env.set("token", "abc123"); ark.env.set("host", "localhost");"#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(
            result.env_mutations.get("token"),
            Some(&Some("abc123".to_string()))
        );
        assert_eq!(
            result.env_mutations.get("host"),
            Some(&Some("localhost".to_string()))
        );
    }

    #[test]
    fn test_env_unset() {
        let mut ctx = empty_context();
        ctx.env.insert("existing".to_string(), "value".to_string());
        let result = execute_script(
            r#"ark.env.unset("existing");"#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(result.env_mutations.get("existing"), Some(&None));
    }

    #[test]
    fn test_env_get() {
        let mut ctx = empty_context();
        ctx.env
            .insert("baseUrl".to_string(), "https://api.test.com".to_string());
        let result = execute_script(
            r#"
            var url = ark.env.get("baseUrl");
            console.log(url);
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(result.console_output[0].message, "https://api.test.com");
    }

    #[test]
    fn test_passing_test() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("status is 200", function() {
                ark.expect(ark.response.status).to.equal(200);
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert_eq!(result.test_results.len(), 1);
        assert!(result.test_results[0].passed);
        assert_eq!(result.test_results[0].name, "status is 200");
    }

    #[test]
    fn test_failing_test() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("status is 404", function() {
                ark.expect(ark.response.status).to.equal(404);
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert_eq!(result.test_results.len(), 1);
        assert!(!result.test_results[0].passed);
        assert!(result.test_results[0].error.is_some());
    }

    #[test]
    fn test_response_json() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("has correct id", function() {
                var body = ark.response.json();
                ark.expect(body.id).to.equal(1);
                ark.expect(body.name).to.equal("Test");
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }

    #[test]
    fn test_expect_have_property() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("body has property", function() {
                var body = ark.response.json();
                ark.expect(body).to.have.property("id");
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }

    #[test]
    fn test_expect_type() {
        let ctx = empty_context();
        let result = execute_script(
            r#"
            ark.test("type checks", function() {
                ark.expect("hello").to.be.a("string");
                ark.expect(42).to.be.a("number");
                ark.expect(true).to.be.a("boolean");
            });
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }

    #[test]
    fn test_expect_include() {
        let ctx = empty_context();
        let result = execute_script(
            r#"
            ark.test("include checks", function() {
                ark.expect("hello world").to.include("world");
                ark.expect([1, 2, 3]).to.include(2);
            });
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }

    #[test]
    fn test_expect_negation() {
        let ctx = empty_context();
        let result = execute_script(
            r#"
            ark.test("negation", function() {
                ark.expect(42).to.not.equal(43);
                ark.expect("hello").to.not.include("xyz");
            });
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }

    #[test]
    fn test_pre_request_modifies_request() {
        let ctx = empty_context();
        let result = execute_script(
            r#"
            ark.request.setUrl("https://modified.com/api");
            ark.request.setHeader("X-Custom", "value");
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(result.request.url, "https://modified.com/api");
        assert_eq!(
            result.request.headers.get("X-Custom"),
            Some(&"value".to_string())
        );
    }

    #[test]
    fn test_post_response_cannot_modify_request() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("cannot modify", function() {
                try {
                    ark.request.setUrl("https://hacked.com");
                    throw new Error("should have thrown");
                } catch(e) {
                    if (e.message === "should have thrown") throw e;
                    // Expected error
                }
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }

    #[test]
    fn test_script_error_returns_error() {
        let ctx = empty_context();
        let result = execute_script("throw new Error('boom');", ctx, ScriptPhase::PreRequest);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("boom") || err.contains("Script error"),
            "Unexpected error: {err}"
        );
    }

    #[test]
    fn test_multiple_tests() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("first", function() { ark.expect(1).to.equal(1); });
            ark.test("second", function() { ark.expect(2).to.equal(3); });
            ark.test("third", function() { ark.expect(true).to.be.true; });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert_eq!(result.test_results.len(), 3);
        assert!(result.test_results[0].passed);
        assert!(!result.test_results[1].passed);
        assert!(result.test_results[2].passed);
    }

    #[test]
    fn test_globals_and_variables() {
        let ctx = empty_context();
        let result = execute_script(
            r#"
            ark.globals.set("apiVersion", "v2");
            ark.variables.set("requestId", "req_123");
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(
            result.global_mutations.get("apiVersion"),
            Some(&Some("v2".to_string()))
        );
        assert_eq!(
            result.variable_mutations.get("requestId"),
            Some(&Some("req_123".to_string()))
        );
    }

    #[test]
    fn test_response_time_and_size() {
        let ctx = context_with_response();
        let result = execute_script(
            r#"
            ark.test("performance", function() {
                ark.expect(ark.response.time).to.be.below(1000);
                ark.expect(ark.response.size).to.be.above(0);
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
    }
}
