use std::time::Instant;

use crate::models::error::HttpEngineError;
use crate::models::request::SendRequestParams;
use crate::models::response::{CookieData, ResponseData};

use super::error_classifier::classify_reqwest_error;
use super::request_builder::{build_client, build_request};
use super::response_parser::{parse_response, parse_set_cookie_header};

/// Core HTTP engine. Executes a request and returns the response.
pub struct HttpEngine;

/// Maximum number of redirects to follow manually.
const MAX_REDIRECTS: usize = 10;

impl HttpEngine {
    /// Send an HTTP request and return the parsed response.
    /// Handles redirects manually to capture Set-Cookie headers from every hop.
    pub async fn send(params: SendRequestParams) -> Result<ResponseData, HttpEngineError> {
        let timeout_ms = params.timeout_ms.unwrap_or(30_000);
        let should_follow_redirects = params.follow_redirects;

        // Always disable automatic redirects — we handle them manually
        // to capture Set-Cookie headers from intermediate responses.
        let mut manual_params = params.clone();
        manual_params.follow_redirects = false;

        let client = build_client(&manual_params)?;
        let request = build_request(&client, &manual_params)?;

        let start = Instant::now();

        let mut response = request
            .send()
            .await
            .map_err(|e| classify_reqwest_error(e, timeout_ms))?;

        // Accumulate cookies from all responses in the redirect chain
        let mut all_cookies: Vec<CookieData> = Vec::with_capacity(4);
        let mut redirect_count = 0;

        // Collect cookies from intermediate redirect responses
        while should_follow_redirects
            && response.status().is_redirection()
            && redirect_count < MAX_REDIRECTS
        {
            // Capture Set-Cookie headers from this redirect response
            collect_set_cookie_headers(&response, &mut all_cookies);

            // Get the redirect location
            let location = response
                .headers()
                .get("location")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            let Some(location) = location else {
                break;
            };

            // Resolve relative URLs
            let next_url = if location.starts_with("http://") || location.starts_with("https://") {
                location
            } else {
                let base = response.url().clone();
                base.join(&location)
                    .map(|u| u.to_string())
                    .unwrap_or(location)
            };

            // Build cookie header from accumulated cookies for the next request
            let cookie_header: String = all_cookies
                .iter()
                .map(|c| format!("{}={}", c.name, c.value))
                .collect::<Vec<_>>()
                .join("; ");

            // Follow the redirect
            let mut next_request = client.get(&next_url);
            if !cookie_header.is_empty() {
                next_request = next_request.header("Cookie", cookie_header);
            }

            response = next_request
                .send()
                .await
                .map_err(|e| classify_reqwest_error(e, timeout_ms))?;

            redirect_count += 1;
        }

        // Capture cookies from the final response too
        collect_set_cookie_headers(&response, &mut all_cookies);

        let elapsed_ms = start.elapsed().as_millis() as u64;

        let mut result = parse_response(response, elapsed_ms).await?;

        // Merge accumulated cookies into the result (dedup by name)
        for cookie in all_cookies {
            if !result.cookies.iter().any(|c| c.name == cookie.name) {
                result.cookies.push(cookie);
            }
        }

        Ok(result)
    }
}

/// Extract Set-Cookie headers from a response and add to the cookie list.
fn collect_set_cookie_headers(response: &reqwest::Response, cookies: &mut Vec<CookieData>) {
    let url = response.url().clone();
    for value in response.headers().get_all("set-cookie").iter() {
        if let Ok(val) = value.to_str() {
            if let Some(cookie) = parse_set_cookie_header(val, &url) {
                // Update existing cookie or add new one
                if let Some(existing) = cookies.iter_mut().find(|c| c.name == cookie.name) {
                    *existing = cookie;
                } else {
                    cookies.push(cookie);
                }
            }
        }
    }
}
