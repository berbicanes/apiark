use crate::models::error::HttpEngineError;

/// Classifies a reqwest error into a typed HttpEngineError with user-friendly context.
pub fn classify_reqwest_error(err: reqwest::Error, timeout_ms: u64) -> HttpEngineError {
    if err.is_timeout() {
        return HttpEngineError::Timeout(timeout_ms);
    }

    if err.is_connect() {
        let msg = err.to_string();
        if msg.contains("dns error")
            || msg.contains("Name or service not known")
            || msg.contains("getaddrinfo")
        {
            return HttpEngineError::DnsFailure(err.to_string());
        }
        return HttpEngineError::ConnectionRefused(err.to_string());
    }

    if err.is_builder() {
        return HttpEngineError::InvalidUrl(err.to_string());
    }

    if err.is_decode() {
        return HttpEngineError::BodyDecodeError(err.to_string());
    }

    // Check for TLS errors in the error chain
    let msg = err.to_string().to_lowercase();
    if msg.contains("tls") || msg.contains("ssl") || msg.contains("certificate") {
        return HttpEngineError::TlsError(err.to_string());
    }

    HttpEngineError::RequestError(err.to_string())
}
