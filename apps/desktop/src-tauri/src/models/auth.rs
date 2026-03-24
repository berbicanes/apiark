use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum AuthConfig {
    None,
    Bearer {
        token: String,
    },
    Basic {
        username: String,
        password: String,
    },
    ApiKey {
        key: String,
        value: String,
        /// "header" or "query"
        #[serde(default = "default_header", rename = "addTo")]
        add_to: ApiKeyLocation,
    },
    Oauth2 {
        #[serde(rename = "grantType")]
        grant_type: OAuth2GrantType,
        #[serde(default, rename = "authUrl")]
        auth_url: String,
        #[serde(default, rename = "tokenUrl")]
        token_url: String,
        #[serde(default, rename = "clientId")]
        client_id: String,
        #[serde(default, rename = "clientSecret")]
        client_secret: String,
        #[serde(default)]
        scope: String,
        #[serde(default = "default_callback_url", rename = "callbackUrl")]
        callback_url: String,
        #[serde(default)]
        username: String,
        #[serde(default)]
        password: String,
        #[serde(default = "default_true", rename = "usePkce")]
        use_pkce: bool,
    },
    Digest {
        username: String,
        password: String,
    },
    #[serde(rename = "aws-v4")]
    AwsV4 {
        #[serde(rename = "accessKey")]
        access_key: String,
        #[serde(rename = "secretKey")]
        secret_key: String,
        #[serde(default)]
        region: String,
        #[serde(default)]
        service: String,
        #[serde(default, rename = "sessionToken")]
        session_token: String,
    },
    Ntlm {
        username: String,
        password: String,
        #[serde(default)]
        domain: String,
        #[serde(default)]
        workstation: String,
    },
    #[serde(rename = "jwt-bearer")]
    JwtBearer {
        /// HMAC secret or RSA/EC private key (PEM)
        secret: String,
        /// Algorithm: HS256, HS384, HS512, RS256, etc.
        #[serde(default = "default_hs256")]
        algorithm: String,
        /// JSON payload for the JWT claims
        #[serde(default)]
        payload: String,
        /// Header prefix (default: "Bearer")
        #[serde(default = "default_bearer_prefix", rename = "headerPrefix")]
        header_prefix: String,
    },
    Saml {
        /// Identity Provider SSO URL
        #[serde(default, rename = "idpUrl")]
        idp_url: String,
        /// Service Provider Entity ID
        #[serde(default, rename = "entityId")]
        entity_id: String,
        /// Assertion Consumer Service URL
        #[serde(default, rename = "assertionConsumerUrl")]
        assertion_consumer_url: String,
        /// IdP X.509 certificate (PEM)
        #[serde(default)]
        certificate: String,
        /// NameID format (e.g. "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress")
        #[serde(default, rename = "nameIdFormat")]
        name_id_format: String,
        /// SAML assertion token (obtained externally from the IdP)
        #[serde(default, rename = "samlToken")]
        saml_token: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ApiKeyLocation {
    #[default]
    Header,
    Query,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum OAuth2GrantType {
    #[default]
    AuthorizationCode,
    ClientCredentials,
    Implicit,
    Password,
}

fn default_header() -> ApiKeyLocation {
    ApiKeyLocation::Header
}

fn default_callback_url() -> String {
    "http://localhost:9876/callback".to_string()
}

fn default_true() -> bool {
    true
}

fn default_hs256() -> String {
    "HS256".to_string()
}

fn default_bearer_prefix() -> String {
    "Bearer".to_string()
}
