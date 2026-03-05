#[allow(unused_imports)]
use md5::{Digest as Md5Digest, Md5};

use hmac::{Hmac, Mac};
use sha2::{Digest as Sha256Digest, Sha256};

/// Generate Digest Auth header value.
/// Used when implementing full challenge-response Digest auth (future).
#[allow(dead_code)]
/// This performs a simplified Digest auth (MD5 algorithm, no qop or with qop=auth).
/// In practice, Digest requires a challenge-response: first request gets 401 with
/// WWW-Authenticate header, then we compute the digest from the nonce.
/// For now, we store the credentials and apply them on the first request.
/// The actual challenge-response is handled by reqwest when we provide the credentials.
pub fn compute_digest_auth_header(
    username: &str,
    password: &str,
    method: &str,
    uri: &str,
    realm: &str,
    nonce: &str,
    qop: Option<&str>,
    nc: &str,
    cnonce: &str,
) -> String {
    // HA1 = MD5(username:realm:password)
    let ha1 = md5_hex(&format!("{username}:{realm}:{password}"));

    // HA2 = MD5(method:uri)
    let ha2 = md5_hex(&format!("{method}:{uri}"));

    // Response
    let response = if let Some(qop) = qop {
        md5_hex(&format!("{ha1}:{nonce}:{nc}:{cnonce}:{qop}:{ha2}"))
    } else {
        md5_hex(&format!("{ha1}:{nonce}:{ha2}"))
    };

    let mut header = format!(
        "Digest username=\"{username}\", realm=\"{realm}\", nonce=\"{nonce}\", uri=\"{uri}\", response=\"{response}\""
    );

    if let Some(qop) = qop {
        header.push_str(&format!(", qop={qop}, nc={nc}, cnonce=\"{cnonce}\""));
    }

    header
}

/// Compute AWS Signature v4 Authorization header.
pub fn compute_aws_v4_auth(
    access_key: &str,
    secret_key: &str,
    session_token: &str,
    region: &str,
    service: &str,
    method: &str,
    url: &url::Url,
    headers: &[(String, String)],
    body: &str,
    now: &chrono::DateTime<chrono::Utc>,
) -> (String, Vec<(String, String)>) {
    let date_stamp = now.format("%Y%m%d").to_string();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();

    let host = url.host_str().unwrap_or("");
    let canonical_uri = url.path();
    let canonical_querystring = url.query().unwrap_or("");

    // Build signed headers
    let mut signed_headers: Vec<(String, String)> = vec![
        ("host".to_string(), host.to_string()),
        ("x-amz-date".to_string(), amz_date.clone()),
    ];
    if !session_token.is_empty() {
        signed_headers.push((
            "x-amz-security-token".to_string(),
            session_token.to_string(),
        ));
    }
    // Include user headers
    for (k, v) in headers {
        let lower = k.to_lowercase();
        if lower != "host"
            && lower != "x-amz-date"
            && lower != "authorization"
            && lower != "x-amz-security-token"
        {
            signed_headers.push((lower, v.clone()));
        }
    }
    signed_headers.sort_by(|a, b| a.0.cmp(&b.0));

    let signed_headers_str = signed_headers
        .iter()
        .map(|(k, _)| k.as_str())
        .collect::<Vec<_>>()
        .join(";");

    let canonical_headers = signed_headers
        .iter()
        .map(|(k, v)| format!("{k}:{}\n", v.trim()))
        .collect::<String>();

    let payload_hash = sha256_hex(body);

    let canonical_request = format!(
        "{method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers_str}\n{payload_hash}"
    );

    let credential_scope = format!("{date_stamp}/{region}/{service}/aws4_request");
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n{}",
        sha256_hex(&canonical_request)
    );

    // Derive signing key
    let k_date = hmac_sha256(
        format!("AWS4{secret_key}").as_bytes(),
        date_stamp.as_bytes(),
    );
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");

    let signature = hex::encode(hmac_sha256(&k_signing, string_to_sign.as_bytes()));

    let auth_header = format!(
        "AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers_str}, Signature={signature}"
    );

    // Extra headers to add
    let mut extra_headers = vec![
        ("x-amz-date".to_string(), amz_date),
        ("x-amz-content-sha256".to_string(), payload_hash),
    ];
    if !session_token.is_empty() {
        extra_headers.push((
            "x-amz-security-token".to_string(),
            session_token.to_string(),
        ));
    }

    (auth_header, extra_headers)
}

/// Generate a JWT token.
pub fn generate_jwt(secret: &str, algorithm: &str, payload_json: &str) -> Result<String, String> {
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};

    let alg = match algorithm.to_uppercase().as_str() {
        "HS256" => Algorithm::HS256,
        "HS384" => Algorithm::HS384,
        "HS512" => Algorithm::HS512,
        "RS256" => Algorithm::RS256,
        "RS384" => Algorithm::RS384,
        "RS512" => Algorithm::RS512,
        "ES256" => Algorithm::ES256,
        "ES384" => Algorithm::ES384,
        other => return Err(format!("Unsupported JWT algorithm: {other}")),
    };

    let claims: serde_json::Value =
        serde_json::from_str(payload_json).map_err(|e| format!("Invalid JWT payload JSON: {e}"))?;

    let header = Header::new(alg);

    let key = match alg {
        Algorithm::HS256 | Algorithm::HS384 | Algorithm::HS512 => {
            EncodingKey::from_secret(secret.as_bytes())
        }
        Algorithm::RS256 | Algorithm::RS384 | Algorithm::RS512 => {
            EncodingKey::from_rsa_pem(secret.as_bytes())
                .map_err(|e| format!("Invalid RSA PEM key: {e}"))?
        }
        Algorithm::ES256 | Algorithm::ES384 => EncodingKey::from_ec_pem(secret.as_bytes())
            .map_err(|e| format!("Invalid EC PEM key: {e}"))?,
        _ => return Err(format!("Unsupported algorithm: {algorithm}")),
    };

    encode(&header, &claims, &key).map_err(|e| format!("Failed to generate JWT: {e}"))
}

#[allow(dead_code)]
fn md5_hex(input: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

// ── NTLM Authentication ──

/// Generate NTLM Type 1 (Negotiate) message.
/// Returns a base64-encoded NTLM negotiate message for the Authorization header.
pub fn generate_ntlm_negotiate(domain: &str, workstation: &str) -> String {
    let domain_bytes = domain.as_bytes();
    let workstation_bytes = workstation.as_bytes();

    let domain_len = domain_bytes.len() as u16;
    let workstation_len = workstation_bytes.len() as u16;

    // Offsets
    let domain_offset: u32 = 32;
    let workstation_offset: u32 = domain_offset + domain_len as u32;

    let mut msg = Vec::new();
    // Signature: "NTLMSSP\0"
    msg.extend_from_slice(b"NTLMSSP\0");
    // Type: 1 (Negotiate)
    msg.extend_from_slice(&1u32.to_le_bytes());
    // Flags: Negotiate Unicode | OEM | Request Target | NTLM | Always Sign
    let flags: u32 = 0x00000001 | 0x00000002 | 0x00000004 | 0x00000200 | 0x00008000;
    msg.extend_from_slice(&flags.to_le_bytes());
    // Domain security buffer: len, max_len, offset
    msg.extend_from_slice(&domain_len.to_le_bytes());
    msg.extend_from_slice(&domain_len.to_le_bytes());
    msg.extend_from_slice(&domain_offset.to_le_bytes());
    // Workstation security buffer
    msg.extend_from_slice(&workstation_len.to_le_bytes());
    msg.extend_from_slice(&workstation_len.to_le_bytes());
    msg.extend_from_slice(&workstation_offset.to_le_bytes());
    // Domain and workstation data
    msg.extend_from_slice(domain_bytes);
    msg.extend_from_slice(workstation_bytes);

    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(&msg)
}

/// Parse NTLM Type 2 (Challenge) message and generate Type 3 (Authenticate).
/// `challenge_b64` is the base64-encoded Type 2 message from the server's WWW-Authenticate header.
/// Returns a base64-encoded Type 3 message.
pub fn generate_ntlm_authenticate(
    challenge_b64: &str,
    username: &str,
    password: &str,
    domain: &str,
    workstation: &str,
) -> Result<String, String> {
    use base64::Engine;
    use md4::{Digest as Md4Digest, Md4};

    let challenge = base64::engine::general_purpose::STANDARD
        .decode(challenge_b64.trim())
        .map_err(|e| format!("Invalid NTLM challenge base64: {e}"))?;

    if challenge.len() < 32 {
        return Err("NTLM challenge message too short".to_string());
    }

    // Verify signature
    if &challenge[0..8] != b"NTLMSSP\0" {
        return Err("Invalid NTLM signature".to_string());
    }

    // Extract server challenge (8 bytes at offset 24)
    let server_challenge = &challenge[24..32];

    // Compute NTLMv1 response (24 bytes)
    // NT Hash = MD4(UTF-16LE(password))
    let password_utf16: Vec<u8> = password
        .encode_utf16()
        .flat_map(|c| c.to_le_bytes())
        .collect();
    let mut md4 = Md4::new();
    md4.update(&password_utf16);
    let nt_hash = md4.finalize();

    // Pad NT hash to 21 bytes
    let mut nt_hash_padded = [0u8; 21];
    nt_hash_padded[..16].copy_from_slice(&nt_hash);

    // DES-encrypt server_challenge with each 7-byte chunk (simplified — use response_from_hash)
    let nt_response = des_encrypt_challenge(&nt_hash_padded, server_challenge);

    // LM Response (for simplicity, set to same as NT response or zeros)
    let lm_response = vec![0u8; 24];

    // Encode strings as OEM (ASCII) for simplicity
    let domain_bytes = domain.as_bytes();
    let username_bytes = username.as_bytes();
    let workstation_bytes = workstation.as_bytes();

    // Build Type 3 message
    let lm_len = lm_response.len() as u16;
    let nt_len = nt_response.len() as u16;
    let domain_len = domain_bytes.len() as u16;
    let user_len = username_bytes.len() as u16;
    let ws_len = workstation_bytes.len() as u16;

    let data_offset: u32 = 64; // Fixed header size
    let mut offset = data_offset;

    let domain_offset = offset;
    offset += domain_len as u32;
    let user_offset = offset;
    offset += user_len as u32;
    let ws_offset = offset;
    offset += ws_len as u32;
    let lm_offset = offset;
    offset += lm_len as u32;
    let nt_offset = offset;

    let mut msg = Vec::new();
    msg.extend_from_slice(b"NTLMSSP\0");
    msg.extend_from_slice(&3u32.to_le_bytes()); // Type 3
                                                // LM security buffer
    msg.extend_from_slice(&lm_len.to_le_bytes());
    msg.extend_from_slice(&lm_len.to_le_bytes());
    msg.extend_from_slice(&lm_offset.to_le_bytes());
    // NT security buffer
    msg.extend_from_slice(&nt_len.to_le_bytes());
    msg.extend_from_slice(&nt_len.to_le_bytes());
    msg.extend_from_slice(&nt_offset.to_le_bytes());
    // Domain security buffer
    msg.extend_from_slice(&domain_len.to_le_bytes());
    msg.extend_from_slice(&domain_len.to_le_bytes());
    msg.extend_from_slice(&domain_offset.to_le_bytes());
    // User security buffer
    msg.extend_from_slice(&user_len.to_le_bytes());
    msg.extend_from_slice(&user_len.to_le_bytes());
    msg.extend_from_slice(&user_offset.to_le_bytes());
    // Workstation security buffer
    msg.extend_from_slice(&ws_len.to_le_bytes());
    msg.extend_from_slice(&ws_len.to_le_bytes());
    msg.extend_from_slice(&ws_offset.to_le_bytes());
    // Encrypted random session key (empty)
    msg.extend_from_slice(&0u16.to_le_bytes());
    msg.extend_from_slice(&0u16.to_le_bytes());
    msg.extend_from_slice(&0u32.to_le_bytes());
    // Flags
    let flags: u32 = 0x00000001 | 0x00000002 | 0x00000200 | 0x00008000;
    msg.extend_from_slice(&flags.to_le_bytes());

    // Data
    msg.extend_from_slice(domain_bytes);
    msg.extend_from_slice(username_bytes);
    msg.extend_from_slice(workstation_bytes);
    msg.extend_from_slice(&lm_response);
    msg.extend_from_slice(&nt_response);

    Ok(base64::engine::general_purpose::STANDARD.encode(&msg))
}

/// Simplified DES encryption of an 8-byte challenge using a 21-byte key (3 x 7-byte DES keys).
/// Returns a 24-byte response.
fn des_encrypt_challenge(key21: &[u8; 21], challenge: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(24);

    for i in 0..3 {
        let key7 = &key21[i * 7..i * 7 + 7];
        let des_key = expand_des_key(key7);
        // Simple DES ECB encryption of the 8-byte challenge
        let encrypted = des_ecb_encrypt(&des_key, challenge);
        result.extend_from_slice(&encrypted);
    }

    result
}

/// Expand a 7-byte key to an 8-byte DES key (with parity bits).
fn expand_des_key(key7: &[u8]) -> [u8; 8] {
    [
        key7[0] >> 1,
        ((key7[0] & 0x01) << 6) | (key7[1] >> 2),
        ((key7[1] & 0x03) << 5) | (key7[2] >> 3),
        ((key7[2] & 0x07) << 4) | (key7[3] >> 4),
        ((key7[3] & 0x0f) << 3) | (key7[4] >> 5),
        ((key7[4] & 0x1f) << 2) | (key7[5] >> 6),
        ((key7[5] & 0x3f) << 1) | (key7[6] >> 7),
        (key7[6] & 0x7f) << 1,
    ]
}

/// DES ECB encryption (single block, 8 bytes) using the `des` crate.
fn des_ecb_encrypt(key: &[u8; 8], data: &[u8]) -> [u8; 8] {
    use des::cipher::{BlockEncrypt, KeyInit};
    use des::Des;

    let cipher = Des::new_from_slice(key).expect("DES key is 8 bytes");
    let mut block = [0u8; 8];
    block.copy_from_slice(&data[..8]);
    let block_ref: &mut des::cipher::generic_array::GenericArray<u8, _> =
        des::cipher::generic_array::GenericArray::from_mut_slice(&mut block);
    cipher.encrypt_block(block_ref);
    block
}
