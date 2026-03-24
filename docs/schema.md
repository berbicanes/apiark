# ApiArk Collection Schema

This document describes the on-disk format for ApiArk collections. All files use standard YAML. Collections are directories — your filesystem structure IS your collection structure.

## No Lock-In Pledge

> If you decide to leave ApiArk, your data leaves with you. Every file is a standard format. Every database is open. We will never make it hard to switch away.

## Directory Structure

```
my-api-project/
├── .apiark/
│   ├── apiark.yaml           # Collection configuration (required)
│   ├── .env                  # Secrets (gitignored)
│   ├── .gitignore
│   └── environments/
│       ├── development.yaml
│       ├── staging.yaml
│       └── production.yaml
├── users/
│   ├── _folder.yaml          # Folder config (optional)
│   ├── get-all-users.yaml    # Request file
│   └── create-user.yaml
└── products/
    └── list-products.yaml
```

## Collection Config (`.apiark/apiark.yaml`)

```yaml
name: My API
version: 1
defaults:
  sendCookies: true       # Auto-send stored cookies (default: true)
  storeCookies: true      # Auto-store response cookies (default: true)
  persistCookies: false   # Persist cookies across app restarts (default: false)
  auth:                   # Default auth for all requests (optional)
    type: bearer
    token: "{{token}}"
```

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string", "description": "Collection display name" },
    "version": { "type": "integer", "default": 1, "description": "Schema version for migration" },
    "defaults": {
      "type": "object",
      "properties": {
        "sendCookies": { "type": "boolean", "default": true },
        "storeCookies": { "type": "boolean", "default": true },
        "persistCookies": { "type": "boolean", "default": false },
        "auth": { "$ref": "#/$defs/AuthConfig" }
      }
    }
  }
}
```

## Request File (`*.yaml`)

Each request is a single YAML file. The filename (minus `.yaml`) is the URL-friendly identifier; the `name` field is the display name.

```yaml
name: Create User
method: POST
url: "{{baseUrl}}/api/users"
description: Creates a new user account.

headers:
  Content-Type: application/json
  X-Request-ID: "{{$uuid}}"

params:
  page: "1"
  limit: "20"

auth:
  type: bearer
  token: "{{adminToken}}"

body:
  type: json
  content: |
    {
      "name": "{{userName}}",
      "email": "{{userEmail}}"
    }

cookies:
  session: "manual-value"

assert:
  status: 201
  body.id: { type: string }
  responseTime: { lt: 2000 }

tests: |
  ark.test("should return created user", () => {
    const body = ark.response.json();
    ark.expect(body).to.have.property("id");
  });

preRequestScript: |
  ark.env.set("userName", `User_${Date.now()}`);

postResponseScript: |
  const body = ark.response.json();
  if (body.id) ark.env.set("createdUserId", body.id);
```

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name", "method", "url"],
  "properties": {
    "name": { "type": "string", "description": "Display name" },
    "method": {
      "type": "string",
      "enum": ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
    },
    "url": { "type": "string", "description": "Request URL (supports {{variables}})" },
    "description": { "type": "string" },
    "headers": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Header key-value pairs"
    },
    "params": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Query parameter key-value pairs"
    },
    "auth": { "$ref": "#/$defs/AuthConfig" },
    "body": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["json", "xml", "form-data", "urlencoded", "raw", "binary", "none"]
        },
        "content": { "type": "string" }
      },
      "required": ["type"]
    },
    "cookies": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Per-request cookie overrides"
    },
    "assert": {
      "type": "object",
      "description": "Declarative assertions (see Assertions section)"
    },
    "tests": { "type": "string", "description": "JavaScript/TypeScript test code" },
    "preRequestScript": { "type": "string", "description": "Script executed before sending" },
    "postResponseScript": { "type": "string", "description": "Script executed after response" }
  }
}
```

## Auth Config

Auth is specified via a tagged union with `type` as the discriminator.

| Type | Fields |
|------|--------|
| `none` | — |
| `bearer` | `token` |
| `basic` | `username`, `password` |
| `api-key` | `key`, `value`, `addTo` (`header` or `query`) |
| `oauth2` | `grantType`, `authUrl`, `tokenUrl`, `clientId`, `clientSecret`, `scope`, `callbackUrl`, `username`, `password`, `usePkce` |
| `digest` | `username`, `password` |
| `aws-v4` | `accessKey`, `secretKey`, `region`, `service`, `sessionToken` |
| `ntlm` | `username`, `password`, `domain`, `workstation` |
| `jwt-bearer` | `secret`, `algorithm`, `payload`, `headerPrefix` |

### Examples

```yaml
# Bearer
auth:
  type: bearer
  token: "{{accessToken}}"

# Basic
auth:
  type: basic
  username: admin
  password: "{{adminPass}}"

# API Key in header
auth:
  type: api-key
  key: X-API-Key
  value: "{{apiKey}}"
  addTo: header

# OAuth 2.0 (Authorization Code + PKCE)
auth:
  type: oauth2
  grantType: authorization_code
  authUrl: https://auth.example.com/authorize
  tokenUrl: https://auth.example.com/token
  clientId: my-app
  clientSecret: ""
  scope: read write
  usePkce: true
```

## Environment File (`environments/*.yaml`)

```yaml
name: Development
variables:
  baseUrl: http://localhost:3000
  apiKey: dev-key-12345
secrets:
  - accessToken
  - adminToken
```

Secret values are stored in `.apiark/.env` (gitignored), not in the YAML file:

```env
accessToken=eyJhbGci...
adminToken=sk-admin-...
```

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string" },
    "variables": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "secrets": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Variable names whose values are in .env"
    }
  }
}
```

## Folder Config (`_folder.yaml`)

Optional file in any subdirectory to control ordering and folder-level auth.

```yaml
name: User Endpoints
auth:
  type: bearer
  token: "{{userToken}}"
order:
  - get-all-users
  - create-user
  - update-user
```

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Folder display name" },
    "auth": { "$ref": "#/$defs/AuthConfig" },
    "order": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Ordered list of child filenames (without .yaml extension)"
    }
  }
}
```

## Assertions

Declarative assertions in the `assert` block support these operators:

| Operator | Description | Example |
|----------|-------------|---------|
| (direct value) | Equality | `status: 200` |
| `eq` | Equal | `body.name: { eq: "John" }` |
| `neq` | Not equal | `status: { neq: 500 }` |
| `gt` / `gte` | Greater than (or equal) | `responseTime: { lt: 2000 }` |
| `lt` / `lte` | Less than (or equal) | `body.count: { gte: 1 }` |
| `in` | Value in array | `status: { in: [200, 201] }` |
| `contains` | String contains | `body.message: { contains: "success" }` |
| `matches` | Regex match | `body.email: { matches: "^.+@.+$" }` |
| `type` | Type check | `body.id: { type: string }` |
| `exists` | Field exists | `body.token: { exists: true }` |
| `length` | Array/string length | `body.items: { length: 10 }` |

## Dynamic Variables

Variables using `{{$name}}` syntax are resolved at send time:

| Variable | Description |
|----------|-------------|
| `{{$uuid}}` | Random UUID v4 |
| `{{$timestamp}}` | Unix timestamp (seconds) |
| `{{$timestampMs}}` | Unix timestamp (milliseconds) |
| `{{$isoTimestamp}}` | ISO 8601 timestamp |
| `{{$randomInt}}` | Random integer 0-1000 |
| `{{$randomFloat}}` | Random float 0-1 |
| `{{$randomString}}` | Random 16-char alphanumeric |
| `{{$randomEmail}}` | Random email address |

## Variable Resolution Priority

Variables are resolved in this order (later overrides earlier):

1. Root `.env` file (collection root directory)
2. Environment YAML `variables`
3. `.apiark/.env` secrets
4. Runtime overrides (set by scripts via `ark.env.set()`)

## App Data Files

These files live in `~/.apiark/` and are not part of collections:

| File | Format | Description |
|------|--------|-------------|
| `settings.json` | JSON | App preferences (theme, proxy, timeouts, certificates) |
| `state.json` | JSON | Open tabs, window positions |
| `data.db` | SQLite | Request history |
| `license.key` | JWT | License key (reserved for future use) |
| `logs/` | Text | Daily rotating log files |
| `crash-reports/` | JSON | Local crash reports |
| `trash/` | YAML | Soft-deleted requests/folders |
| `cookies/` | JSON | Persisted cookie jars (per-collection) |

All files are human-readable standard formats. You can inspect, edit, or back up any of them with standard tools.
