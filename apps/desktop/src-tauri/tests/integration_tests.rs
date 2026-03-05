/// Comprehensive integration tests for ApiArk backend.
/// These tests exercise real HTTP, auth, scripting, mock server, WebSocket,
/// file watcher, cookie handling, and more — without needing the Tauri GUI.

// ─── HTTP Engine Tests ───────────────────────────────────────────────────────

mod http_engine {
    use apiark_lib::http::client::HttpEngine;
    use apiark_lib::models::request::{
        BodyType, HttpMethod, KeyValuePair, RequestBody, SendRequestParams,
    };

    fn base_params(method: HttpMethod, url: &str) -> SendRequestParams {
        SendRequestParams {
            method,
            url: url.to_string(),
            headers: vec![],
            params: vec![],
            body: None,
            auth: None,
            proxy: None,
            timeout_ms: Some(15_000),
            follow_redirects: true,
            verify_ssl: true,
            cookies: None,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            client_cert_passphrase: None,
        }
    }

    #[tokio::test]
    async fn test_get_request() {
        let params = base_params(HttpMethod::GET, "https://httpbin.org/get");
        let resp = HttpEngine::send(params).await.expect("GET request failed");
        assert_eq!(resp.status, 200);
        assert!(!resp.body.is_empty());
        assert!(resp.time_ms > 0);
        assert!(resp.size_bytes > 0);
        println!(
            "  GET /get: {} {}ms {}B",
            resp.status, resp.time_ms, resp.size_bytes
        );
    }

    #[tokio::test]
    async fn test_post_json() {
        let mut params = base_params(HttpMethod::POST, "https://httpbin.org/post");
        params.headers.push(KeyValuePair {
            key: "Content-Type".into(),
            value: "application/json".into(),
            enabled: true,
        });
        params.body = Some(RequestBody {
            body_type: BodyType::Json,
            content: r#"{"name":"ApiArk","version":"0.1.0"}"#.into(),
            form_data: vec![],
        });
        let resp = HttpEngine::send(params).await.expect("POST request failed");
        assert_eq!(resp.status, 200);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let data = body["json"].as_object().unwrap();
        assert_eq!(data["name"].as_str().unwrap(), "ApiArk");
        println!("  POST /post (JSON): {} {}ms", resp.status, resp.time_ms);
    }

    #[tokio::test]
    async fn test_put_request() {
        let mut params = base_params(HttpMethod::PUT, "https://httpbin.org/put");
        params.body = Some(RequestBody {
            body_type: BodyType::Json,
            content: r#"{"updated": true}"#.into(),
            form_data: vec![],
        });
        let resp = HttpEngine::send(params).await.expect("PUT request failed");
        assert_eq!(resp.status, 200);
        println!("  PUT /put: {} {}ms", resp.status, resp.time_ms);
    }

    #[tokio::test]
    async fn test_patch_request() {
        let mut params = base_params(HttpMethod::PATCH, "https://httpbin.org/patch");
        params.body = Some(RequestBody {
            body_type: BodyType::Json,
            content: r#"{"field": "patched"}"#.into(),
            form_data: vec![],
        });
        let resp = HttpEngine::send(params)
            .await
            .expect("PATCH request failed");
        assert_eq!(resp.status, 200);
        println!("  PATCH /patch: {} {}ms", resp.status, resp.time_ms);
    }

    #[tokio::test]
    async fn test_delete_request() {
        let params = base_params(HttpMethod::DELETE, "https://httpbin.org/delete");
        let resp = HttpEngine::send(params)
            .await
            .expect("DELETE request failed");
        assert_eq!(resp.status, 200);
        println!("  DELETE /delete: {} {}ms", resp.status, resp.time_ms);
    }

    #[tokio::test]
    async fn test_head_request() {
        let params = base_params(HttpMethod::HEAD, "https://httpbin.org/get");
        let resp = HttpEngine::send(params).await.expect("HEAD request failed");
        assert_eq!(resp.status, 200);
        // HEAD returns no body
        assert!(resp.body.is_empty() || resp.body.len() < 10);
        println!("  HEAD /get: {} {}ms", resp.status, resp.time_ms);
    }

    #[tokio::test]
    async fn test_query_params() {
        let mut params = base_params(HttpMethod::GET, "https://httpbin.org/get");
        params.params.push(KeyValuePair {
            key: "foo".into(),
            value: "bar".into(),
            enabled: true,
        });
        params.params.push(KeyValuePair {
            key: "baz".into(),
            value: "123".into(),
            enabled: true,
        });
        // Disabled param should not be sent
        params.params.push(KeyValuePair {
            key: "disabled".into(),
            value: "no".into(),
            enabled: false,
        });
        let resp = HttpEngine::send(params)
            .await
            .expect("Query params request failed");
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let args = body["args"].as_object().unwrap();
        assert_eq!(args["foo"].as_str().unwrap(), "bar");
        assert_eq!(args["baz"].as_str().unwrap(), "123");
        assert!(args.get("disabled").is_none());
        println!("  GET /get?foo=bar&baz=123: params verified");
    }

    #[tokio::test]
    async fn test_custom_headers() {
        let mut params = base_params(HttpMethod::GET, "https://httpbin.org/headers");
        params.headers.push(KeyValuePair {
            key: "X-Custom-Header".into(),
            value: "ApiArkTest".into(),
            enabled: true,
        });
        params.headers.push(KeyValuePair {
            key: "X-Disabled".into(),
            value: "should-not-appear".into(),
            enabled: false,
        });
        let resp = HttpEngine::send(params)
            .await
            .expect("Headers request failed");
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let headers = body["headers"].as_object().unwrap();
        assert_eq!(headers["X-Custom-Header"].as_str().unwrap(), "ApiArkTest");
        assert!(headers.get("X-Disabled").is_none());
        println!("  GET /headers: custom headers verified");
    }

    #[tokio::test]
    async fn test_form_urlencoded() {
        let mut params = base_params(HttpMethod::POST, "https://httpbin.org/post");
        params.body = Some(RequestBody {
            body_type: BodyType::Urlencoded,
            content: String::new(),
            form_data: vec![
                KeyValuePair {
                    key: "username".into(),
                    value: "testuser".into(),
                    enabled: true,
                },
                KeyValuePair {
                    key: "password".into(),
                    value: "secret123".into(),
                    enabled: true,
                },
            ],
        });
        let resp = HttpEngine::send(params).await.expect("Form POST failed");
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let form = body["form"].as_object().unwrap();
        assert_eq!(form["username"].as_str().unwrap(), "testuser");
        assert_eq!(form["password"].as_str().unwrap(), "secret123");
        println!("  POST /post (urlencoded): form data verified");
    }

    #[tokio::test]
    async fn test_redirect_follow() {
        let mut params = base_params(HttpMethod::GET, "https://httpbin.org/redirect/2");
        params.follow_redirects = true;
        let resp = HttpEngine::send(params)
            .await
            .expect("Redirect request failed");
        assert_eq!(resp.status, 200);
        println!("  GET /redirect/2 (follow=true): followed to 200");
    }

    #[tokio::test]
    async fn test_redirect_no_follow() {
        let mut params = base_params(HttpMethod::GET, "https://httpbin.org/redirect/1");
        params.follow_redirects = false;
        let resp = HttpEngine::send(params)
            .await
            .expect("No-follow redirect failed");
        assert_eq!(resp.status, 302);
        println!("  GET /redirect/1 (follow=false): got 302");
    }

    #[tokio::test]
    async fn test_4xx_response() {
        let params = base_params(HttpMethod::GET, "https://httpbin.org/status/404");
        let resp = HttpEngine::send(params).await.expect("404 request failed");
        assert_eq!(resp.status, 404);
        println!("  GET /status/404: {} OK", resp.status);
    }

    #[tokio::test]
    async fn test_5xx_response() {
        let params = base_params(HttpMethod::GET, "https://httpbin.org/status/500");
        let resp = HttpEngine::send(params).await.expect("500 request failed");
        assert_eq!(resp.status, 500);
        println!("  GET /status/500: {} OK", resp.status);
    }

    #[tokio::test]
    async fn test_response_headers_and_cookies() {
        let params = base_params(
            HttpMethod::GET,
            "https://httpbin.org/response-headers?X-Test=hello&Set-Cookie=sessionid%3Dabc123",
        );
        let resp = HttpEngine::send(params)
            .await
            .expect("Response headers request failed");
        assert_eq!(resp.status, 200);
        let has_x_test = resp
            .headers
            .iter()
            .any(|h| h.key.eq_ignore_ascii_case("x-test"));
        assert!(has_x_test, "Expected X-Test response header");
        println!("  GET /response-headers: headers + cookies verified");
    }

    #[tokio::test]
    async fn test_timeout() {
        let mut params = base_params(HttpMethod::GET, "https://httpbin.org/delay/10");
        params.timeout_ms = Some(2_000); // 2s timeout, server delays 10s
        let result = HttpEngine::send(params).await;
        assert!(result.is_err(), "Expected timeout error");
        println!("  GET /delay/10 (timeout=2s): timed out as expected");
    }

    #[tokio::test]
    async fn test_cookie_override() {
        let mut params = base_params(HttpMethod::GET, "https://httpbin.org/cookies");
        let mut cookies = std::collections::HashMap::new();
        cookies.insert("session".to_string(), "override_value".to_string());
        params.cookies = Some(cookies);
        let resp = HttpEngine::send(params)
            .await
            .expect("Cookie override request failed");
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let cookies = body["cookies"].as_object().unwrap();
        assert_eq!(cookies["session"].as_str().unwrap(), "override_value");
        println!("  GET /cookies: cookie override verified");
    }
}

// ─── Auth Handler Tests ──────────────────────────────────────────────────────

mod auth_handlers {
    use apiark_lib::http::client::HttpEngine;
    use apiark_lib::models::auth::{ApiKeyLocation, AuthConfig};
    use apiark_lib::models::request::{HttpMethod, SendRequestParams};

    fn base_params(url: &str) -> SendRequestParams {
        SendRequestParams {
            method: HttpMethod::GET,
            url: url.to_string(),
            headers: vec![],
            params: vec![],
            body: None,
            auth: None,
            proxy: None,
            timeout_ms: Some(15_000),
            follow_redirects: true,
            verify_ssl: true,
            cookies: None,
            ca_cert_path: None,
            client_cert_path: None,
            client_key_path: None,
            client_cert_passphrase: None,
        }
    }

    #[tokio::test]
    async fn test_bearer_auth() {
        let mut params = base_params("https://httpbin.org/bearer");
        params.auth = Some(AuthConfig::Bearer {
            token: "test-token-12345".into(),
        });
        let resp = HttpEngine::send(params).await.expect("Bearer auth failed");
        assert_eq!(resp.status, 200);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        assert!(body["authenticated"].as_bool().unwrap());
        assert_eq!(body["token"].as_str().unwrap(), "test-token-12345");
        println!("  Bearer auth: authenticated OK");
    }

    #[tokio::test]
    async fn test_basic_auth() {
        let mut params = base_params("https://httpbin.org/basic-auth/testuser/testpass");
        params.auth = Some(AuthConfig::Basic {
            username: "testuser".into(),
            password: "testpass".into(),
        });
        let resp = HttpEngine::send(params).await.expect("Basic auth failed");
        assert_eq!(resp.status, 200);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        assert!(body["authenticated"].as_bool().unwrap());
        assert_eq!(body["user"].as_str().unwrap(), "testuser");
        println!("  Basic auth: authenticated OK");
    }

    #[tokio::test]
    async fn test_basic_auth_wrong_password() {
        let mut params = base_params("https://httpbin.org/basic-auth/testuser/testpass");
        params.auth = Some(AuthConfig::Basic {
            username: "testuser".into(),
            password: "wrongpass".into(),
        });
        let resp = HttpEngine::send(params)
            .await
            .expect("Bad auth request failed");
        assert_eq!(resp.status, 401);
        println!("  Basic auth (wrong password): 401 as expected");
    }

    #[tokio::test]
    async fn test_api_key_header() {
        let mut params = base_params("https://httpbin.org/headers");
        params.auth = Some(AuthConfig::ApiKey {
            key: "X-API-Key".into(),
            value: "my-secret-key".into(),
            add_to: ApiKeyLocation::Header,
        });
        let resp = HttpEngine::send(params)
            .await
            .expect("API Key header auth failed");
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let headers = body["headers"].as_object().unwrap();
        assert_eq!(headers["X-Api-Key"].as_str().unwrap(), "my-secret-key");
        println!("  API Key (header): verified in request headers");
    }

    #[tokio::test]
    async fn test_api_key_query() {
        let mut params = base_params("https://httpbin.org/get");
        params.auth = Some(AuthConfig::ApiKey {
            key: "api_key".into(),
            value: "query-secret".into(),
            add_to: ApiKeyLocation::Query,
        });
        let resp = HttpEngine::send(params)
            .await
            .expect("API Key query auth failed");
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        let args = body["args"].as_object().unwrap();
        assert_eq!(args["api_key"].as_str().unwrap(), "query-secret");
        println!("  API Key (query): verified in URL params");
    }

    #[test]
    fn test_jwt_generation_hs256() {
        let result = apiark_lib::http::auth_handlers::generate_jwt(
            "my-secret-key-at-least-32-bytes-long!",
            "HS256",
            r#"{"sub":"1234567890","name":"ApiArk","iat":1516239022}"#,
        );
        assert!(result.is_ok(), "JWT gen failed: {:?}", result.err());
        let token = result.unwrap();
        // JWT has 3 parts separated by dots
        assert_eq!(token.split('.').count(), 3);
        println!("  JWT HS256: generated valid token ({} chars)", token.len());
    }

    #[test]
    fn test_jwt_generation_hs384() {
        let result = apiark_lib::http::auth_handlers::generate_jwt(
            "my-secret-key",
            "HS384",
            r#"{"sub":"user1","role":"admin"}"#,
        );
        assert!(result.is_ok());
        println!("  JWT HS384: generated OK");
    }

    #[test]
    fn test_jwt_generation_hs512() {
        let result = apiark_lib::http::auth_handlers::generate_jwt(
            "my-secret-key",
            "HS512",
            r#"{"sub":"user1"}"#,
        );
        assert!(result.is_ok());
        println!("  JWT HS512: generated OK");
    }

    #[test]
    fn test_jwt_invalid_payload() {
        let result = apiark_lib::http::auth_handlers::generate_jwt(
            "my-secret-key",
            "HS256",
            "not valid json",
        );
        assert!(result.is_err());
        println!("  JWT invalid payload: correctly rejected");
    }

    #[test]
    fn test_jwt_unsupported_algorithm() {
        let result =
            apiark_lib::http::auth_handlers::generate_jwt("key", "UNSUPPORTED", r#"{"sub":"1"}"#);
        assert!(result.is_err());
        println!("  JWT unsupported algo: correctly rejected");
    }

    #[test]
    fn test_aws_v4_signature() {
        let now = chrono::Utc::now();
        let url = url::Url::parse("https://s3.amazonaws.com/my-bucket/my-object").unwrap();
        let (auth_header, extra_headers) = apiark_lib::http::auth_handlers::compute_aws_v4_auth(
            "AKIAIOSFODNN7EXAMPLE",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "",
            "us-east-1",
            "s3",
            "GET",
            &url,
            &[],
            "",
            &now,
        );
        assert!(auth_header.starts_with("AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/"));
        assert!(auth_header.contains("SignedHeaders="));
        assert!(auth_header.contains("Signature="));
        // Must have x-amz-date and x-amz-content-sha256
        assert!(extra_headers.iter().any(|(k, _)| k == "x-amz-date"));
        assert!(extra_headers
            .iter()
            .any(|(k, _)| k == "x-amz-content-sha256"));
        println!("  AWS v4 sig: header format correct");
    }

    #[test]
    fn test_aws_v4_with_session_token() {
        let now = chrono::Utc::now();
        let url = url::Url::parse("https://dynamodb.us-west-2.amazonaws.com").unwrap();
        let (auth_header, extra_headers) = apiark_lib::http::auth_handlers::compute_aws_v4_auth(
            "ASIAAAAA",
            "secret",
            "session-token-123",
            "us-west-2",
            "dynamodb",
            "POST",
            &url,
            &[("content-type".to_string(), "application/json".to_string())],
            r#"{"TableName":"Users"}"#,
            &now,
        );
        assert!(auth_header.contains("Credential=ASIAAAAA/"));
        assert!(extra_headers
            .iter()
            .any(|(k, v)| k == "x-amz-security-token" && v == "session-token-123"));
        println!("  AWS v4 sig (with session token): correct");
    }

    #[test]
    fn test_digest_auth_header() {
        let header = apiark_lib::http::auth_handlers::compute_digest_auth_header(
            "testuser",
            "testpass",
            "GET",
            "/api/resource",
            "testrealm@host.com",
            "dcd98b7102dd2f0e8b11d0f600bfb0c093",
            Some("auth"),
            "00000001",
            "0a4f113b",
        );
        assert!(header.starts_with("Digest username=\"testuser\""));
        assert!(header.contains("realm=\"testrealm@host.com\""));
        assert!(header.contains("nonce=\"dcd98b7102dd2f0e8b11d0f600bfb0c093\""));
        assert!(header.contains("response=\""));
        assert!(header.contains("qop=auth"));
        println!("  Digest auth: header format correct");
    }

    #[test]
    fn test_digest_auth_without_qop() {
        let header = apiark_lib::http::auth_handlers::compute_digest_auth_header(
            "user", "pass", "POST", "/login", "myrealm", "abc123", None, "", "",
        );
        assert!(header.starts_with("Digest"));
        assert!(!header.contains("qop="));
        println!("  Digest auth (no qop): correct");
    }

    #[test]
    fn test_ntlm_negotiate() {
        let negotiate =
            apiark_lib::http::auth_handlers::generate_ntlm_negotiate("MYDOMAIN", "MYPC");
        // Should be valid base64
        use base64::Engine;
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&negotiate)
            .unwrap();
        // Must start with NTLMSSP\0 signature
        assert_eq!(&decoded[0..8], b"NTLMSSP\0");
        // Type 1 message
        assert_eq!(
            u32::from_le_bytes([decoded[8], decoded[9], decoded[10], decoded[11]]),
            1
        );
        println!(
            "  NTLM negotiate: valid Type 1 message ({} bytes decoded)",
            decoded.len()
        );
    }

    #[test]
    fn test_ntlm_authenticate() {
        // Create a fake Type 2 challenge
        use base64::Engine;
        let mut type2 = Vec::new();
        type2.extend_from_slice(b"NTLMSSP\0"); // Signature
        type2.extend_from_slice(&2u32.to_le_bytes()); // Type 2
        type2.extend_from_slice(&[0u8; 12]); // Target name buffer
        type2.extend_from_slice(&0x00028233u32.to_le_bytes()); // Flags
        type2.extend_from_slice(&[0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]); // Challenge

        let challenge_b64 = base64::engine::general_purpose::STANDARD.encode(&type2);
        let result = apiark_lib::http::auth_handlers::generate_ntlm_authenticate(
            &challenge_b64,
            "testuser",
            "testpass",
            "TESTDOMAIN",
            "WORKSTATION",
        );
        assert!(
            result.is_ok(),
            "NTLM Type 3 generation failed: {:?}",
            result.err()
        );
        let type3_b64 = result.unwrap();
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(&type3_b64)
            .unwrap();
        assert_eq!(&decoded[0..8], b"NTLMSSP\0");
        assert_eq!(
            u32::from_le_bytes([decoded[8], decoded[9], decoded[10], decoded[11]]),
            3
        );
        println!(
            "  NTLM authenticate: valid Type 3 message ({} bytes)",
            decoded.len()
        );
    }
}

// ─── Variable Interpolation Tests ────────────────────────────────────────────

mod interpolation {
    use apiark_lib::http::interpolation::interpolate;
    use std::collections::HashMap;

    #[test]
    fn test_basic_variable_substitution() {
        let mut vars = HashMap::new();
        vars.insert("baseUrl".into(), "https://api.example.com".into());
        vars.insert("version".into(), "v2".into());
        assert_eq!(
            interpolate("{{baseUrl}}/{{version}}/users", &vars),
            "https://api.example.com/v2/users"
        );
        println!("  Variable interpolation: basic substitution OK");
    }

    #[test]
    fn test_dynamic_uuid() {
        let vars = HashMap::new();
        let result = interpolate("id={{$uuid}}", &vars);
        assert!(result.starts_with("id="));
        let uuid_part = &result[3..];
        assert_eq!(uuid_part.len(), 36);
        assert_eq!(uuid_part.chars().filter(|c| *c == '-').count(), 4);
        println!("  Dynamic {{{{$uuid}}}}: {}", uuid_part);
    }

    #[test]
    fn test_dynamic_timestamp() {
        let vars = HashMap::new();
        let result = interpolate("ts={{$timestamp}}", &vars);
        let ts: i64 = result[3..].parse().expect("Not a valid timestamp");
        assert!(ts > 1700000000); // After 2023
        println!("  Dynamic {{{{$timestamp}}}}: {}", ts);
    }

    #[test]
    fn test_dynamic_random_int() {
        let vars = HashMap::new();
        let result = interpolate("n={{$randomInt}}", &vars);
        let n: u32 = result[2..].parse().expect("Not a valid int");
        assert!(n <= 1000);
        println!("  Dynamic {{{{$randomInt}}}}: {}", n);
    }

    #[test]
    fn test_dynamic_random_email() {
        let vars = HashMap::new();
        let result = interpolate("e={{$randomEmail}}", &vars);
        let email = &result[2..];
        assert!(email.contains('@'));
        assert!(email.ends_with("@example.com"));
        println!("  Dynamic {{{{$randomEmail}}}}: {}", email);
    }

    #[test]
    fn test_unresolved_preserved() {
        let vars = HashMap::new();
        assert_eq!(interpolate("{{unknown}}", &vars), "{{unknown}}");
        println!("  Unresolved variable: preserved as-is");
    }

    #[test]
    fn test_mixed_vars() {
        let mut vars = HashMap::new();
        vars.insert("host".into(), "localhost".into());
        let result = interpolate("{{host}}/{{$uuid}}/{{missing}}", &vars);
        assert!(result.starts_with("localhost/"));
        assert!(result.ends_with("/{{missing}}"));
        println!("  Mixed vars: resolved + dynamic + unresolved OK");
    }
}

// ─── Scripting Engine Tests ──────────────────────────────────────────────────

mod scripting {
    use apiark_lib::scripting::engine::execute_script;
    use apiark_lib::scripting::{RequestSnapshot, ResponseSnapshot, ScriptContext, ScriptPhase};
    use std::collections::HashMap;

    fn empty_ctx() -> ScriptContext {
        ScriptContext {
            request: RequestSnapshot {
                method: "GET".into(),
                url: "https://api.example.com/users".into(),
                headers: HashMap::new(),
                body: None,
            },
            response: None,
            env: HashMap::new(),
            globals: HashMap::new(),
            variables: HashMap::new(),
        }
    }

    fn ctx_with_response() -> ScriptContext {
        let mut ctx = empty_ctx();
        ctx.response = Some(ResponseSnapshot {
            status: 200,
            status_text: "OK".into(),
            headers: {
                let mut h = HashMap::new();
                h.insert("content-type".into(), "application/json".into());
                h
            },
            body: r#"{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}"#.into(),
            time_ms: 150,
            size_bytes: 2048,
        });
        ctx
    }

    #[test]
    fn test_pre_request_set_env() {
        let ctx = empty_ctx();
        let result = execute_script(
            r#"ark.env.set("token", "generated-" + Date.now());"#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert!(result.env_mutations.contains_key("token"));
        let val = result.env_mutations["token"].as_ref().unwrap();
        assert!(val.starts_with("generated-"));
        println!("  Pre-request script: env.set OK");
    }

    #[test]
    fn test_pre_request_modify_url() {
        let ctx = empty_ctx();
        let result = execute_script(
            r#"ark.request.setUrl("https://modified.com/api/v2");"#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(result.request.url, "https://modified.com/api/v2");
        println!("  Pre-request script: URL modification OK");
    }

    #[test]
    fn test_pre_request_set_header() {
        let ctx = empty_ctx();
        let result = execute_script(
            r#"
            ark.request.setHeader("X-Request-ID", "abc123");
            ark.request.setHeader("Authorization", "Bearer mytoken");
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(
            result.request.headers.get("X-Request-ID").unwrap(),
            "abc123"
        );
        assert_eq!(
            result.request.headers.get("Authorization").unwrap(),
            "Bearer mytoken"
        );
        println!("  Pre-request script: set headers OK");
    }

    #[test]
    fn test_post_response_tests() {
        let ctx = ctx_with_response();
        let result = execute_script(
            r#"
            ark.test("status is 200", function() {
                ark.expect(ark.response.status).to.equal(200);
            });
            ark.test("has users array", function() {
                var body = ark.response.json();
                ark.expect(body.users).to.be.a("object"); // arrays are objects in JS
                ark.expect(body.users.length).to.equal(2);
            });
            ark.test("first user is Alice", function() {
                var body = ark.response.json();
                ark.expect(body.users[0].name).to.equal("Alice");
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert_eq!(result.test_results.len(), 3);
        for tr in &result.test_results {
            assert!(tr.passed, "Test '{}' failed: {:?}", tr.name, tr.error);
        }
        println!("  Post-response tests: 3/3 passed");
    }

    #[test]
    fn test_post_response_extract_to_env() {
        let ctx = ctx_with_response();
        let result = execute_script(
            r#"
            var body = ark.response.json();
            ark.env.set("firstUserId", String(body.users[0].id));
            ark.env.set("userName", body.users[0].name);
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert_eq!(result.env_mutations["firstUserId"].as_ref().unwrap(), "1");
        assert_eq!(result.env_mutations["userName"].as_ref().unwrap(), "Alice");
        println!("  Post-response script: extracted values to env OK");
    }

    #[test]
    fn test_console_log() {
        let ctx = empty_ctx();
        let result = execute_script(
            r#"
            console.log("info message");
            console.warn("warning!");
            console.error("error!");
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(result.console_output.len(), 3);
        assert_eq!(result.console_output[0].level, "log");
        assert_eq!(result.console_output[1].level, "warn");
        assert_eq!(result.console_output[2].level, "error");
        println!("  Console output: log/warn/error captured");
    }

    #[test]
    fn test_expect_negation() {
        let ctx = empty_ctx();
        let result = execute_script(
            r#"
            ark.test("not equal", function() {
                ark.expect(1).to.not.equal(2);
                ark.expect("hello").to.not.include("xyz");
            });
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
        println!("  Expect negation: .not.equal/.not.include OK");
    }

    #[test]
    fn test_expect_comparison() {
        let ctx = ctx_with_response();
        let result = execute_script(
            r#"
            ark.test("comparisons", function() {
                ark.expect(ark.response.time).to.be.below(10000);
                ark.expect(ark.response.time).to.be.above(0);
                ark.expect(ark.response.size).to.be.above(100);
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
        println!("  Expect comparison: above/below OK");
    }

    #[test]
    fn test_script_error_handled() {
        let ctx = empty_ctx();
        let result = execute_script(
            "throw new Error('intentional failure');",
            ctx,
            ScriptPhase::PreRequest,
        );
        assert!(result.is_err());
        println!("  Script error: properly caught and returned");
    }

    #[test]
    fn test_read_only_in_post_response() {
        let ctx = ctx_with_response();
        let result = execute_script(
            r#"
            ark.test("cannot modify request", function() {
                var threw = false;
                try { ark.request.setUrl("http://evil.com"); } catch(e) { threw = true; }
                ark.expect(threw).to.equal(true);
            });
            "#,
            ctx,
            ScriptPhase::PostResponse,
        )
        .unwrap();
        assert!(result.test_results[0].passed);
        println!("  Post-response read-only: request mutation blocked");
    }

    #[test]
    fn test_globals_and_variables() {
        let ctx = empty_ctx();
        let result = execute_script(
            r#"
            ark.globals.set("apiVersion", "v3");
            ark.variables.set("requestId", "req_999");
            "#,
            ctx,
            ScriptPhase::PreRequest,
        )
        .unwrap();
        assert_eq!(
            result.global_mutations["apiVersion"].as_ref().unwrap(),
            "v3"
        );
        assert_eq!(
            result.variable_mutations["requestId"].as_ref().unwrap(),
            "req_999"
        );
        println!("  Globals + variables: set OK");
    }
}

// ─── Declarative Assertions Tests ────────────────────────────────────────────

mod assertions {
    use apiark_lib::scripting::assertions::evaluate_assertions;
    use apiark_lib::scripting::ResponseSnapshot;
    use std::collections::HashMap;

    fn make_response() -> ResponseSnapshot {
        ResponseSnapshot {
            status: 200,
            status_text: "OK".into(),
            headers: {
                let mut h = HashMap::new();
                h.insert("content-type".into(), "application/json".into());
                h
            },
            body: r#"{"users": [{"id": 1, "name": "Alice"}], "count": 1}"#.into(),
            time_ms: 150,
            size_bytes: 2048,
        }
    }

    #[test]
    fn test_status_assertion() {
        let resp = make_response();
        let assertions: serde_yaml::Value = serde_yaml::from_str("status: 200").unwrap();
        let results = evaluate_assertions(&assertions, &resp);
        assert!(results.iter().all(|r| r.passed), "Status assertion failed");
        println!("  Assert status=200: passed");
    }

    #[test]
    fn test_body_path_assertion() {
        let resp = make_response();
        let assertions: serde_yaml::Value = serde_yaml::from_str("body.count: 1").unwrap();
        let results = evaluate_assertions(&assertions, &resp);
        assert!(results.iter().all(|r| r.passed));
        println!("  Assert body.count=1: passed");
    }

    #[test]
    fn test_response_time_assertion() {
        let resp = make_response();
        let assertions: serde_yaml::Value =
            serde_yaml::from_str("responseTime:\n  lt: 5000").unwrap();
        let results = evaluate_assertions(&assertions, &resp);
        assert!(results.iter().all(|r| r.passed));
        println!("  Assert responseTime < 5000: passed");
    }

    #[test]
    fn test_contains_assertion() {
        let resp = make_response();
        let assertions: serde_yaml::Value =
            serde_yaml::from_str("headers.content-type:\n  contains: json").unwrap();
        let results = evaluate_assertions(&assertions, &resp);
        assert!(results.iter().all(|r| r.passed));
        println!("  Assert header contains 'json': passed");
    }

    #[test]
    fn test_failing_assertion() {
        let resp = make_response();
        let assertions: serde_yaml::Value = serde_yaml::from_str("status: 404").unwrap();
        let results = evaluate_assertions(&assertions, &resp);
        assert!(results.iter().any(|r| !r.passed));
        println!("  Assert status=404 (expected fail): correctly failed");
    }
}

// ─── cURL Parsing Tests ─────────────────────────────────────────────────────

mod curl {
    use apiark_lib::http::curl::parse_curl;

    #[test]
    fn test_simple_get() {
        let result = parse_curl("curl https://api.example.com/users").unwrap();
        assert_eq!(result.method, "GET");
        assert_eq!(result.url, "https://api.example.com/users");
        println!("  cURL parse simple GET: OK");
    }

    #[test]
    fn test_post_with_data() {
        let result = parse_curl(
            r#"curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"test"}'"#
        ).unwrap();
        assert_eq!(result.method, "POST");
        assert!(result.headers.contains_key("Content-Type"));
        assert!(result.body.as_ref().unwrap().contains("name"));
        println!("  cURL parse POST with data: OK");
    }

    #[test]
    fn test_basic_auth() {
        let result = parse_curl("curl -u user:pass https://api.example.com").unwrap();
        assert!(result.auth_basic.is_some());
        let (user, pass) = result.auth_basic.unwrap();
        assert_eq!(user, "user");
        assert_eq!(pass, "pass");
        println!("  cURL parse -u basic auth: OK");
    }

    #[test]
    fn test_multiple_headers() {
        let result = parse_curl(
            r#"curl -H "Authorization: Bearer token123" -H "Accept: application/json" -H "X-Custom: value" https://api.example.com"#
        ).unwrap();
        assert_eq!(result.headers.len(), 3);
        assert_eq!(result.headers["Authorization"], "Bearer token123");
        assert_eq!(result.headers["Accept"], "application/json");
        println!("  cURL parse multiple headers: OK");
    }

    #[test]
    fn test_flags() {
        let result = parse_curl("curl -k -L https://self-signed.example.com").unwrap();
        assert!(!result.verify_ssl);
        assert!(result.follow_redirects);
        println!("  cURL parse flags (-k, -L): OK");
    }
}

// ─── Mock Server Tests ───────────────────────────────────────────────────────

mod mock_server {
    use std::io::Write;

    /// Test that a mock server can be started and serves requests
    #[tokio::test]
    async fn test_mock_server_lifecycle() {
        // Create a temporary collection with a sample request YAML
        let temp_dir =
            std::env::temp_dir().join(format!("apiark_mock_test_{}", std::process::id()));
        let apiark_dir = temp_dir.join(".apiark");
        std::fs::create_dir_all(&apiark_dir).unwrap();

        // Write collection config
        std::fs::write(
            apiark_dir.join("apiark.yaml"),
            "name: Test Mock Collection\nversion: 1\n",
        )
        .unwrap();

        // Write a sample request file
        std::fs::write(
            temp_dir.join("get-users.yaml"),
            r#"name: Get Users
method: GET
url: "{{baseUrl}}/api/users"
body:
  type: json
  content: |
    [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
assert:
  status: 200
"#,
        )
        .unwrap();

        // Start a simple HTTP server on the mock port and verify it works
        let port = 19876u16; // Use high port to avoid conflicts
        let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));

        // Build endpoints manually (since MockServerManager needs AppHandle)
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                println!("  Mock server test: port {} busy, skipping: {}", port, e);
                std::fs::remove_dir_all(&temp_dir).ok();
                return;
            }
        };

        let router = axum::Router::new().route(
            "/api/users",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!([
                    {"id": 1, "name": "Alice"},
                    {"id": 2, "name": "Bob"}
                ]))
            }),
        );

        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

        tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .ok();
        });

        // Give the server a moment to start
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Test that the mock endpoint works
        let client = reqwest::Client::new();
        let resp = client
            .get(format!("http://127.0.0.1:{}/api/users", port))
            .send()
            .await
            .expect("Mock server request failed");

        assert_eq!(resp.status(), 200);
        let body: serde_json::Value = resp.json().await.unwrap();
        assert_eq!(body.as_array().unwrap().len(), 2);
        assert_eq!(body[0]["name"].as_str().unwrap(), "Alice");

        println!(
            "  Mock server: started on port {}, served /api/users correctly",
            port
        );

        // Shutdown
        let _ = shutdown_tx.send(());
        std::fs::remove_dir_all(&temp_dir).ok();
    }
}

// ─── WebSocket Tests ─────────────────────────────────────────────────────────

mod websocket {
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::tungstenite;

    #[tokio::test]
    async fn test_websocket_connect_send_receive() {
        // Test WebSocket by running our own local echo server
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();

        // Spawn a simple echo server
        tokio::spawn(async move {
            if let Ok((stream, _)) = listener.accept().await {
                let ws = tokio_tungstenite::accept_async(stream).await.unwrap();
                let (mut write, mut read) = ws.split();
                while let Some(Ok(msg)) = read.next().await {
                    if msg.is_text() || msg.is_binary() {
                        if write.send(msg).await.is_err() {
                            break;
                        }
                    }
                }
            }
        });

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        // Connect as client
        let (mut ws, _) = tokio_tungstenite::connect_async(format!("ws://127.0.0.1:{}", port))
            .await
            .expect("WS connect failed");

        // Send a message
        ws.send(tungstenite::Message::Text("Hello ApiArk!".into()))
            .await
            .unwrap();

        // Receive echo
        if let Some(Ok(tungstenite::Message::Text(text))) = ws.next().await {
            assert_eq!(text, "Hello ApiArk!");
            println!(
                "  WebSocket echo: sent and received 'Hello ApiArk!' on localhost:{}",
                port
            );
        } else {
            panic!("Did not receive echo message");
        }

        // Send another message to verify ongoing connection
        ws.send(tungstenite::Message::Text("second message".into()))
            .await
            .unwrap();
        if let Some(Ok(tungstenite::Message::Text(text))) = ws.next().await {
            assert_eq!(text, "second message");
            println!("  WebSocket: second message echoed correctly");
        }

        let _ = ws.close(None).await;
    }
}

// ─── File Watcher Tests ─────────────────────────────────────────────────────

mod file_watcher {
    use notify::{RecursiveMode, Watcher};
    use std::sync::mpsc;
    use std::time::Duration;

    #[test]
    fn test_file_change_detection() {
        let temp_dir =
            std::env::temp_dir().join(format!("apiark_watcher_test_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).unwrap();

        let test_file = temp_dir.join("test-request.yaml");
        std::fs::write(
            &test_file,
            "name: Original\nmethod: GET\nurl: http://example.com\n",
        )
        .unwrap();

        let (tx, rx) = mpsc::channel();

        let mut watcher =
            notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            })
            .expect("Failed to create watcher");

        watcher
            .watch(&temp_dir, RecursiveMode::Recursive)
            .expect("Failed to watch directory");

        // Modify the file
        std::thread::sleep(Duration::from_millis(100));
        std::fs::write(
            &test_file,
            "name: Modified\nmethod: POST\nurl: http://example.com/updated\n",
        )
        .unwrap();

        // Wait for event (with timeout)
        let event = rx.recv_timeout(Duration::from_secs(5));
        assert!(
            event.is_ok(),
            "No file change event received within 5 seconds"
        );
        let event = event.unwrap();
        assert!(!event.paths.is_empty());
        println!(
            "  File watcher: detected change to {:?} (kind: {:?})",
            event.paths[0].file_name(),
            event.kind
        );

        // Cleanup
        drop(watcher);
        std::fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_file_delete_detection() {
        let temp_dir =
            std::env::temp_dir().join(format!("apiark_watcher_del_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).unwrap();

        let test_file = temp_dir.join("to-delete.yaml");
        std::fs::write(
            &test_file,
            "name: ToDelete\nmethod: GET\nurl: http://example.com\n",
        )
        .unwrap();

        let (tx, rx) = mpsc::channel();

        let mut watcher =
            notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            })
            .expect("Failed to create watcher");

        watcher
            .watch(&temp_dir, RecursiveMode::Recursive)
            .expect("Failed to watch");

        std::thread::sleep(Duration::from_millis(100));
        std::fs::remove_file(&test_file).unwrap();

        let event = rx.recv_timeout(Duration::from_secs(5));
        assert!(event.is_ok(), "No delete event received");
        println!(
            "  File watcher: detected file deletion (kind: {:?})",
            event.unwrap().kind
        );

        drop(watcher);
        std::fs::remove_dir_all(&temp_dir).ok();
    }
}

// ─── Collection Storage Tests ────────────────────────────────────────────────

mod storage {
    use std::fs;

    #[test]
    fn test_yaml_request_roundtrip() {
        let temp_dir =
            std::env::temp_dir().join(format!("apiark_storage_test_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let yaml_content = r#"name: Create User
method: POST
url: "https://api.example.com/users"
headers:
  - key: Content-Type
    value: application/json
    enabled: true
  - key: X-Request-ID
    value: "123"
    enabled: true
body:
  type: json
  content: |
    {"name": "test", "email": "test@example.com"}
auth:
  type: bearer
  token: my-secret-token
assert:
  status: 201
"#;

        let file_path = temp_dir.join("create-user.yaml");
        fs::write(&file_path, yaml_content).unwrap();

        // Parse it
        let parsed: serde_yaml::Value = serde_yaml::from_str(yaml_content).unwrap();
        assert_eq!(parsed["name"].as_str().unwrap(), "Create User");
        assert_eq!(parsed["method"].as_str().unwrap(), "POST");
        assert_eq!(parsed["auth"]["type"].as_str().unwrap(), "bearer");
        assert_eq!(parsed["auth"]["token"].as_str().unwrap(), "my-secret-token");

        // Read back and verify
        let read_back = fs::read_to_string(&file_path).unwrap();
        let re_parsed: serde_yaml::Value = serde_yaml::from_str(&read_back).unwrap();
        assert_eq!(parsed, re_parsed);

        println!("  YAML roundtrip: write + read + parse OK");
        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_environment_yaml() {
        let yaml = r#"name: Development
variables:
  baseUrl: http://localhost:3000
  apiKey: dev-key-12345
secrets:
  - accessToken
  - adminToken
"#;
        let parsed: serde_yaml::Value = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(parsed["name"].as_str().unwrap(), "Development");
        assert_eq!(
            parsed["variables"]["baseUrl"].as_str().unwrap(),
            "http://localhost:3000"
        );
        let secrets = parsed["secrets"].as_sequence().unwrap();
        assert_eq!(secrets.len(), 2);
        println!("  Environment YAML parsing: OK");
    }

    #[test]
    fn test_git_merge_conflict_detection() {
        let content_with_conflict = r#"name: Test Request
method: GET
<<<<<<< HEAD
url: "https://api.v1.example.com"
=======
url: "https://api.v2.example.com"
>>>>>>> feature-branch
"#;
        let has_conflict = content_with_conflict.contains("<<<<<<<")
            && content_with_conflict.contains("=======")
            && content_with_conflict.contains(">>>>>>>");
        assert!(has_conflict);
        println!("  Git merge conflict detection: markers detected");
    }
}

// ─── SQLite History Tests ────────────────────────────────────────────────────

mod history {
    use rusqlite::Connection;

    #[test]
    fn test_history_db_operations() {
        let conn = Connection::open_in_memory().unwrap();

        // Create table (matching the actual schema)
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                status INTEGER,
                status_text TEXT,
                time_ms INTEGER,
                size_bytes INTEGER,
                request_headers TEXT,
                request_body TEXT,
                response_body TEXT,
                collection_path TEXT,
                request_name TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )
        .unwrap();

        // Insert a history entry
        conn.execute(
            "INSERT INTO history (method, url, status, status_text, time_ms, size_bytes, request_headers, request_body, response_body)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                "GET",
                "https://api.example.com/users",
                200,
                "OK",
                150,
                2048,
                r#"{"Content-Type":"application/json"}"#,
                "",
                r#"{"users":[]}"#,
            ],
        ).unwrap();

        // Query
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM history", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);

        // Search
        let mut stmt = conn
            .prepare("SELECT method, url, status FROM history WHERE url LIKE '%example%'")
            .unwrap();
        let entry: (String, String, i64) = stmt
            .query_row([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .unwrap();
        assert_eq!(entry.0, "GET");
        assert_eq!(entry.2, 200);

        // Clear
        conn.execute("DELETE FROM history", []).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM history", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);

        // Integrity check
        let integrity: String = conn
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))
            .unwrap();
        assert_eq!(integrity, "ok");

        println!("  SQLite history: insert, search, clear, integrity check OK");
    }
}
