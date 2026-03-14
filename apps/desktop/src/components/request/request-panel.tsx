import { useState, useEffect, useCallback, useMemo } from "react";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { KeyValueEditor } from "./key-value-editor";
import type { AuthConfig, BodyType, OAuth2GrantType, OAuthTokenStatus } from "@apiark/types";
import { oauthStartFlow, oauthGetTokenStatus, oauthClearToken } from "@/lib/tauri-api";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { CodeEditor } from "@/components/ui/code-editor";

/** Extract :paramName path variables from a URL */
function extractPathVariables(url: string): string[] {
  const matches = url.match(/:([\w]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

type Tab = "params" | "headers" | "body" | "auth" | "scripts" | "tests";

const TABS: { id: Tab; label: string }[] = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" },
  { id: "scripts", label: "Scripts" },
  { id: "tests", label: "Tests" },
];

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "raw", label: "Raw" },
  { value: "urlencoded", label: "URL Encoded" },
  { value: "form-data", label: "Form Data" },
];

export function RequestPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("params");
  const tab = useActiveTab();
  const {
    setParams,
    setHeaders,
    setBody,
    setAuth,
    setPreRequestScript,
    setPostResponseScript,
    setTestScript,
    setAssertions,
    setUrl,
  } = useTabStore();

  const pathVars = useMemo(() => tab ? extractPathVariables(tab.url) : [], [tab?.url]);

  if (!tab) return null;

  const { params, headers, body, auth, url } = tab;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-tour={`tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm transition-colors ${
              activeTab === t.id
                ? "border-b-2 border-blue-500 text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {t.label}
            {t.id === "params" && params.filter((p) => p.key).length > 0 && (
              <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
                ({params.filter((p) => p.key).length})
              </span>
            )}
            {t.id === "headers" && headers.filter((h) => h.key).length > 0 && (
              <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
                ({headers.filter((h) => h.key).length})
              </span>
            )}
            {t.id === "scripts" && (tab.preRequestScript || tab.postResponseScript) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
            {t.id === "tests" && (tab.testScript || tab.assertions) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "params" && (
          <div className="relative space-y-4">
            {pathVars.length > 0 && (
              <PathVariablesEditor
                url={url}
                pathVars={pathVars}
                onUrlChange={setUrl}
              />
            )}
            <KeyValueEditor
              pairs={params}
              onChange={setParams}
              keyPlaceholder="Parameter"
              valuePlaceholder="Value"
            />
            <HintTooltip hintId="env-vars" message="Tip: Use {{variableName}} for dynamic values from environments" />
          </div>
        )}

        {activeTab === "headers" && (
          <KeyValueEditor
            pairs={headers}
            onChange={setHeaders}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
          />
        )}

        {activeTab === "body" && (
          <BodyEditor body={body} onChange={setBody} />
        )}

        {activeTab === "auth" && (
          <AuthEditor auth={auth} onChange={setAuth} />
        )}

        {activeTab === "scripts" && (
          <ScriptsEditor
            preRequestScript={tab.preRequestScript}
            postResponseScript={tab.postResponseScript}
            onPreRequestChange={setPreRequestScript}
            onPostResponseChange={setPostResponseScript}
          />
        )}

        {activeTab === "tests" && (
          <TestsEditor
            assertions={tab.assertions}
            testScript={tab.testScript}
            onAssertionsChange={setAssertions}
            onTestScriptChange={setTestScript}
          />
        )}
      </div>
    </div>
  );
}

function PathVariablesEditor({
  url,
  pathVars,
  onUrlChange,
}: {
  url: string;
  pathVars: string[];
  onUrlChange: (url: string) => void;
}) {
  // Extract current values from the URL
  // We store a map of param name -> user-typed value
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (paramName: string, value: string) => {
    setValues((prev) => ({ ...prev, [paramName]: value }));

    // Replace :paramName with the value in the URL
    if (value) {
      onUrlChange(url.replace(new RegExp(`:${paramName}\\b`), value));
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
        Path Variables
      </label>
      <div className="space-y-1">
        {pathVars.map((param) => (
          <div key={param} className="grid grid-cols-[1fr_1fr] gap-2">
            <div className="flex items-center rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-purple-400">
              :{param}
            </div>
            <input
              type="text"
              value={values[param] ?? ""}
              onChange={(e) => handleChange(param, e.target.value)}
              placeholder="Value"
              className="rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptsEditor({
  preRequestScript,
  postResponseScript,
  onPreRequestChange,
  onPostResponseChange,
}: {
  preRequestScript: string | null;
  postResponseScript: string | null;
  onPreRequestChange: (script: string | null) => void;
  onPostResponseChange: (script: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Pre-request Script
        </label>
        <p className="mb-2 text-xs text-[var(--color-text-dimmed)]">
          Runs before the request is sent. Use <code className="rounded bg-[var(--color-elevated)] px-1">ark.env.set()</code>, <code className="rounded bg-[var(--color-elevated)] px-1">ark.request.setHeader()</code>, etc.
        </p>
        <CodeEditor
          value={preRequestScript ?? ""}
          onChange={(v) => onPreRequestChange(v || null)}
          language="javascript"
          height="150px"
          placeholder="// ark.env.set('token', 'abc123');"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Post-response Script
        </label>
        <p className="mb-2 text-xs text-[var(--color-text-dimmed)]">
          Runs after the response is received. Access response via <code className="rounded bg-[var(--color-elevated)] px-1">ark.response.json()</code>, <code className="rounded bg-[var(--color-elevated)] px-1">ark.response.status</code>, etc.
        </p>
        <CodeEditor
          value={postResponseScript ?? ""}
          onChange={(v) => onPostResponseChange(v || null)}
          language="javascript"
          height="150px"
          placeholder="// const body = ark.response.json();"
        />
      </div>
    </div>
  );
}

function TestsEditor({
  assertions,
  testScript,
  onAssertionsChange,
  onTestScriptChange,
}: {
  assertions: string | null;
  testScript: string | null;
  onAssertionsChange: (assertions: string | null) => void;
  onTestScriptChange: (script: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Assertions (YAML)
        </label>
        <p className="mb-2 text-xs text-[var(--color-text-dimmed)]">
          Declarative checks. E.g. <code className="rounded bg-[var(--color-elevated)] px-1">status: 200</code>, <code className="rounded bg-[var(--color-elevated)] px-1">{"body.id: { type: string }"}</code>
        </p>
        <CodeEditor
          value={assertions ?? ""}
          onChange={(v) => onAssertionsChange(v || null)}
          language="yaml"
          height="130px"
          placeholder="status: 200"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          Test Script (JavaScript)
        </label>
        <p className="mb-2 text-xs text-[var(--color-text-dimmed)]">
          Write tests using <code className="rounded bg-[var(--color-elevated)] px-1">ark.test()</code> and <code className="rounded bg-[var(--color-elevated)] px-1">ark.expect()</code>.
        </p>
        <CodeEditor
          value={testScript ?? ""}
          onChange={(v) => onTestScriptChange(v || null)}
          language="javascript"
          height="150px"
          placeholder='ark.test("status is 200", function() { ... });'
        />
      </div>
    </div>
  );
}

function BodyEditor({
  body,
  onChange,
}: {
  body: { type: BodyType; content: string; formData: { key: string; value: string; enabled: boolean }[] };
  onChange: (body: { type: BodyType; content: string; formData: { key: string; value: string; enabled: boolean }[] }) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Body type selector */}
      <div className="flex gap-2">
        {BODY_TYPES.map((bt) => (
          <button
            key={bt.value}
            onClick={() => onChange({ ...body, type: bt.value })}
            className={`rounded px-3 py-1 text-xs transition-colors ${
              body.type === bt.value
                ? "bg-blue-600 text-white"
                : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {bt.label}
          </button>
        ))}
      </div>

      {/* Body content */}
      {body.type !== "none" && body.type !== "form-data" && body.type !== "urlencoded" && (
        <CodeEditor
          value={body.content}
          onChange={(v) => onChange({ ...body, content: v })}
          language={body.type === "json" ? "json" : body.type === "xml" ? "xml" : "plaintext"}
          height="220px"
          placeholder={body.type === "json" ? '{\n  "key": "value"\n}' : ""}
        />
      )}

      {(body.type === "form-data" || body.type === "urlencoded") && (
        <KeyValueEditor
          pairs={body.formData.length > 0 ? body.formData : [{ key: "", value: "", enabled: true }]}
          onChange={(formData) => onChange({ ...body, formData })}
          keyPlaceholder="Field"
          valuePlaceholder="Value"
        />
      )}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-blue-500";
const SELECT_CLASS =
  "rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-blue-500";

function AuthEditor({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Auth type selector */}
      <select
        value={auth.type}
        onChange={(e) => {
          const type = e.target.value as AuthConfig["type"];
          switch (type) {
            case "none":
              onChange({ type: "none" });
              break;
            case "bearer":
              onChange({ type: "bearer", token: "" });
              break;
            case "basic":
              onChange({ type: "basic", username: "", password: "" });
              break;
            case "api-key":
              onChange({ type: "api-key", key: "", value: "", addTo: "header" });
              break;
            case "oauth2":
              onChange({
                type: "oauth2",
                grantType: "authorization_code",
                authUrl: "",
                tokenUrl: "",
                clientId: "",
                clientSecret: "",
                scope: "",
                callbackUrl: "http://localhost:9876/callback",
                username: "",
                password: "",
                usePkce: true,
              });
              break;
            case "digest":
              onChange({ type: "digest", username: "", password: "" });
              break;
            case "aws-v4":
              onChange({
                type: "aws-v4",
                accessKey: "",
                secretKey: "",
                region: "",
                service: "",
                sessionToken: "",
              });
              break;
            case "jwt-bearer":
              onChange({
                type: "jwt-bearer",
                secret: "",
                algorithm: "HS256",
                payload: '{\n  "sub": "1234567890",\n  "iat": 0\n}',
                headerPrefix: "Bearer",
              });
              break;
            case "ntlm":
              onChange({
                type: "ntlm",
                username: "",
                password: "",
                domain: "",
                workstation: "",
              });
              break;
          }
        }}
        className={SELECT_CLASS}
      >
        <option value="none">No Auth</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
        <option value="api-key">API Key</option>
        <option value="oauth2">OAuth 2.0</option>
        <option value="digest">Digest Auth</option>
        <option value="aws-v4">AWS Signature v4</option>
        <option value="jwt-bearer">JWT Bearer</option>
        <option value="ntlm">NTLM</option>
      </select>

      {/* Auth fields */}
      {auth.type === "bearer" && (
        <input
          type="text"
          value={auth.token}
          onChange={(e) => onChange({ ...auth, token: e.target.value })}
          placeholder="Token"
          className={INPUT_CLASS}
        />
      )}

      {auth.type === "basic" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.username}
            onChange={(e) => onChange({ ...auth, username: e.target.value })}
            placeholder="Username"
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) => onChange({ ...auth, password: e.target.value })}
            placeholder="Password"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.key}
            onChange={(e) => onChange({ ...auth, key: e.target.value })}
            placeholder="Key name (e.g. X-API-Key)"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.value}
            onChange={(e) => onChange({ ...auth, value: e.target.value })}
            placeholder="Value"
            className={INPUT_CLASS}
          />
          <select
            value={auth.addTo}
            onChange={(e) =>
              onChange({ ...auth, addTo: e.target.value as "header" | "query" })
            }
            className={SELECT_CLASS}
          >
            <option value="header">Header</option>
            <option value="query">Query Param</option>
          </select>
        </div>
      )}

      {auth.type === "oauth2" && (
        <OAuth2Editor auth={auth} onChange={onChange} />
      )}

      {auth.type === "digest" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.username}
            onChange={(e) => onChange({ ...auth, username: e.target.value })}
            placeholder="Username"
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) => onChange({ ...auth, password: e.target.value })}
            placeholder="Password"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {auth.type === "aws-v4" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.accessKey}
            onChange={(e) => onChange({ ...auth, accessKey: e.target.value })}
            placeholder="Access Key"
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.secretKey}
            onChange={(e) => onChange({ ...auth, secretKey: e.target.value })}
            placeholder="Secret Key"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.region}
            onChange={(e) => onChange({ ...auth, region: e.target.value })}
            placeholder="Region (e.g. us-east-1)"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.service}
            onChange={(e) => onChange({ ...auth, service: e.target.value })}
            placeholder="Service (e.g. s3, execute-api)"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.sessionToken}
            onChange={(e) => onChange({ ...auth, sessionToken: e.target.value })}
            placeholder="Session Token (optional)"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {auth.type === "jwt-bearer" && (
        <div className="space-y-2">
          <select
            value={auth.algorithm}
            onChange={(e) => onChange({ ...auth, algorithm: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="HS256">HS256</option>
            <option value="HS384">HS384</option>
            <option value="HS512">HS512</option>
            <option value="RS256">RS256</option>
            <option value="RS384">RS384</option>
            <option value="RS512">RS512</option>
            <option value="ES256">ES256</option>
            <option value="ES384">ES384</option>
          </select>
          <input
            type="password"
            value={auth.secret}
            onChange={(e) => onChange({ ...auth, secret: e.target.value })}
            placeholder={auth.algorithm.startsWith("HS") ? "HMAC Secret" : "Private Key (PEM)"}
            className={INPUT_CLASS}
          />
          <textarea
            value={auth.payload}
            onChange={(e) => onChange({ ...auth, payload: e.target.value })}
            placeholder='{"sub": "user", "iat": 0}'
            rows={5}
            className={INPUT_CLASS + " resize-y font-mono"}
          />
          <input
            type="text"
            value={auth.headerPrefix}
            onChange={(e) => onChange({ ...auth, headerPrefix: e.target.value })}
            placeholder="Header Prefix (default: Bearer)"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {auth.type === "ntlm" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.username}
            onChange={(e) => onChange({ ...auth, username: e.target.value })}
            placeholder="Username"
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) => onChange({ ...auth, password: e.target.value })}
            placeholder="Password"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.domain}
            onChange={(e) => onChange({ ...auth, domain: e.target.value })}
            placeholder="Domain (optional)"
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.workstation}
            onChange={(e) => onChange({ ...auth, workstation: e.target.value })}
            placeholder="Workstation (optional)"
            className={INPUT_CLASS}
          />
        </div>
      )}
    </div>
  );
}

function OAuth2Editor({
  auth,
  onChange,
}: {
  auth: Extract<AuthConfig, { type: "oauth2" }>;
  onChange: (auth: AuthConfig) => void;
}) {
  const [tokenStatus, setTokenStatus] = useState<OAuthTokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${auth.clientId}:${auth.authUrl}`;

  const refreshStatus = useCallback(async () => {
    if (!auth.clientId) return;
    try {
      const status = await oauthGetTokenStatus(cacheKey);
      setTokenStatus(status);
    } catch {
      // ignore - no token yet
    }
  }, [cacheKey, auth.clientId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleGetToken = async () => {
    setLoading(true);
    setError(null);
    try {
      await oauthStartFlow(auth);
      await refreshStatus();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClearToken = async () => {
    try {
      await oauthClearToken(cacheKey);
      setTokenStatus(null);
    } catch {
      // ignore
    }
  };

  const showAuthUrl =
    auth.grantType === "authorization_code" || auth.grantType === "implicit";
  const showTokenUrl = auth.grantType !== "implicit";
  const showPassword = auth.grantType === "password";
  const showPkce = auth.grantType === "authorization_code";

  return (
    <div className="space-y-2">
      {/* Grant Type */}
      <label className="block">
        <span className="text-xs text-[var(--color-text-secondary)]">Grant Type</span>
        <select
          value={auth.grantType}
          onChange={(e) =>
            onChange({ ...auth, grantType: e.target.value as OAuth2GrantType })
          }
          className={SELECT_CLASS + " w-full"}
        >
          <option value="authorization_code">Authorization Code</option>
          <option value="client_credentials">Client Credentials</option>
          <option value="implicit">Implicit</option>
          <option value="password">Password</option>
        </select>
      </label>

      {/* Auth URL */}
      {showAuthUrl && (
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">Auth URL</span>
          <input
            type="text"
            value={auth.authUrl}
            onChange={(e) => onChange({ ...auth, authUrl: e.target.value })}
            placeholder="https://provider.com/oauth/authorize"
            className={INPUT_CLASS}
          />
        </label>
      )}

      {/* Token URL */}
      {showTokenUrl && (
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">Token URL</span>
          <input
            type="text"
            value={auth.tokenUrl}
            onChange={(e) => onChange({ ...auth, tokenUrl: e.target.value })}
            placeholder="https://provider.com/oauth/token"
            className={INPUT_CLASS}
          />
        </label>
      )}

      {/* Client ID & Secret */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">Client ID</span>
          <input
            type="text"
            value={auth.clientId}
            onChange={(e) => onChange({ ...auth, clientId: e.target.value })}
            placeholder="Client ID"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">Client Secret</span>
          <input
            type="password"
            value={auth.clientSecret}
            onChange={(e) => onChange({ ...auth, clientSecret: e.target.value })}
            placeholder="Client Secret"
            className={INPUT_CLASS}
          />
        </label>
      </div>

      {/* Scope */}
      <label className="block">
        <span className="text-xs text-[var(--color-text-secondary)]">Scope</span>
        <input
          type="text"
          value={auth.scope}
          onChange={(e) => onChange({ ...auth, scope: e.target.value })}
          placeholder="openid profile email"
          className={INPUT_CLASS}
        />
      </label>

      {/* Username & Password (password grant only) */}
      {showPassword && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-[var(--color-text-secondary)]">Username</span>
            <input
              type="text"
              value={auth.username}
              onChange={(e) => onChange({ ...auth, username: e.target.value })}
              placeholder="Username"
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--color-text-secondary)]">Password</span>
            <input
              type="password"
              value={auth.password}
              onChange={(e) => onChange({ ...auth, password: e.target.value })}
              placeholder="Password"
              className={INPUT_CLASS}
            />
          </label>
        </div>
      )}

      {/* Callback URL */}
      {showAuthUrl && (
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">Callback URL</span>
          <input
            type="text"
            value={auth.callbackUrl}
            onChange={(e) => onChange({ ...auth, callbackUrl: e.target.value })}
            placeholder="http://localhost:9876/callback"
            className={INPUT_CLASS}
          />
        </label>
      )}

      {/* PKCE */}
      {showPkce && (
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={auth.usePkce}
            onChange={(e) => onChange({ ...auth, usePkce: e.target.checked })}
            className="rounded"
          />
          Use PKCE (recommended)
        </label>
      )}

      {/* Token Status & Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleGetToken}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Get Token"}
        </button>
        {tokenStatus?.hasToken && (
          <button
            onClick={handleClearToken}
            className="rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Clear Token
          </button>
        )}
      </div>

      {/* Token status display */}
      {tokenStatus?.hasToken && (
        <div
          className={`rounded px-3 py-1.5 text-xs ${
            tokenStatus.isExpired
              ? "bg-red-500/10 text-red-400"
              : "bg-green-500/10 text-green-400"
          }`}
        >
          {tokenStatus.isExpired
            ? "Token expired"
            : tokenStatus.expiresAt
              ? `Token valid (expires ${new Date(tokenStatus.expiresAt * 1000).toLocaleTimeString()})`
              : "Token valid (no expiry)"}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
