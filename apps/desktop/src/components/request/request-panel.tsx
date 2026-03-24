import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { KeyValueEditor } from "./key-value-editor";
import type { AuthConfig, BodyType, RequestBody, KeyValuePair, OAuth2GrantType, OAuthTokenStatus } from "@apiark/types";
import { oauthStartFlow, oauthGetTokenStatus, oauthClearToken } from "@/lib/tauri-api";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { CodeEditor } from "@/components/ui/code-editor";
import { Plus, Trash2, FileUp } from "lucide-react";

/** Extract :paramName path variables from a URL */
function extractPathVariables(url: string): string[] {
  const matches = url.match(/:([\w]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

type Tab = "params" | "headers" | "body" | "auth" | "scripts" | "tests";

const TAB_IDS: Tab[] = ["params", "headers", "body", "auth", "scripts", "tests"];

const TAB_LABEL_KEYS: Record<Tab, string> = {
  params: "request.params",
  headers: "request.headers",
  body: "request.body",
  auth: "request.auth",
  scripts: "request.scripts",
  tests: "request.tests",
};

const BODY_TYPE_IDS: BodyType[] = ["none", "json", "xml", "raw", "urlencoded", "form-data"];

const BODY_TYPE_LABEL_KEYS: Record<BodyType, string> = {
  none: "body.none",
  json: "body.json",
  xml: "body.xml",
  raw: "body.raw",
  urlencoded: "body.urlencoded",
  "form-data": "body.formData",
  binary: "body.binary",
};

export function RequestPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("params");
  const tab = useActiveTab();
  const {
    setParams,
    setHeaders,
    setBody,
    setAuth,
    setUrl,
    setPathVariables,
    setPreRequestScript,
    setPostResponseScript,
    setTestScript,
    setAssertions,
  } = useTabStore();

  const pathVars = useMemo(() => tab ? extractPathVariables(tab.url) : [], [tab?.url]);

  if (!tab) return null;

  const { params, headers, body, auth, pathVariables } = tab;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {TAB_IDS.map((tabId) => (
          <button
            key={tabId}
            data-tour={`tab-${tabId}`}
            onClick={() => setActiveTab(tabId)}
            className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm transition-colors ${
              activeTab === tabId
                ? "border-b-2 border-blue-500 text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {t(TAB_LABEL_KEYS[tabId])}
            {tabId === "params" && params.filter((p) => p.key).length > 0 && (
              <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
                ({params.filter((p) => p.key).length})
              </span>
            )}
            {tabId === "headers" && headers.filter((h) => h.key).length > 0 && (
              <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
                ({headers.filter((h) => h.key).length})
              </span>
            )}
            {tabId === "scripts" && (tab.preRequestScript || tab.postResponseScript) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
            {tabId === "tests" && (tab.testScript || tab.assertions) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "params" && (
          <div className="relative space-y-4">
            <PathVariablesEditor
              url={tab.url}
              pathVars={pathVars}
              values={pathVariables}
              onChange={setPathVariables}
              onUrlChange={setUrl}
            />
            <KeyValueEditor
              pairs={params}
              onChange={setParams}
              keyPlaceholder="Parameter"
              valuePlaceholder={t("request.value")}
            />
            <HintTooltip hintId="env-vars" message="Tip: Use {{variableName}} for dynamic values from environments" />
          </div>
        )}

        {activeTab === "headers" && (
          <KeyValueEditor
            pairs={headers}
            onChange={setHeaders}
            keyPlaceholder="Header"
            valuePlaceholder={t("request.value")}
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
  values,
  onChange,
  onUrlChange,
}: {
  url: string;
  pathVars: string[];
  values: Record<string, string>;
  onChange: (pathVariables: Record<string, string>) => void;
  onUrlChange: (url: string) => void;
}) {
  const { t } = useTranslation();
  const [newVarName, setNewVarName] = useState("");

  const handleChange = (paramName: string, value: string) => {
    onChange({ ...values, [paramName]: value });
  };

  const handleAdd = () => {
    const name = newVarName.trim();
    if (!name || pathVars.includes(name)) return;
    const separator = url.endsWith("/") ? "" : "/";
    onUrlChange(`${url}${separator}:${name}`);
    setNewVarName("");
  };

  const handleRemove = (param: string) => {
    // Remove :param from the URL
    const updated = url
      .replace(new RegExp(`/:${param}(?=/|$)`), "")
      .replace(new RegExp(`:${param}(?=/|$)`), "");
    onUrlChange(updated || "/");
    const next = { ...values };
    delete next[param];
    onChange(next);
  };

  if (pathVars.length === 0 && !newVarName) return null;

  return (
    <div className="space-y-1">
      {/* Header row — matches KeyValueEditor layout */}
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-1 text-xs text-[var(--color-text-muted)]">
        <span>{t("request.pathVariables")}</span>
        <span>{t("request.value")}</span>
        <span className="w-7" />
      </div>

      {/* Rows */}
      {pathVars.map((param) => (
        <div key={param} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-1">
          <div className="flex items-center rounded bg-[var(--color-elevated)] px-2 py-1 text-sm font-medium text-purple-400">
            :{param}
          </div>
          <input
            type="text"
            value={values[param] ?? ""}
            onChange={(e) => handleChange(param, e.target.value)}
            placeholder={t("request.value")}
            className="rounded bg-[var(--color-elevated)] px-2 py-1 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => handleRemove(param)}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Add row — only show when no path vars exist yet or user started typing */}
      {(pathVars.length === 0 || newVarName) && (
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-1">
          <input
            type="text"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder={t("request.variableName")}
            className="rounded bg-[var(--color-elevated)] px-2 py-1 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div />
          <button
            onClick={handleAdd}
            disabled={!newVarName.trim() || pathVars.includes(newVarName.trim())}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

let formKvCounter = 0;
const formKvId = () => `kv_fd_${Date.now()}_${++formKvCounter}`;

function FormDataEditor({
  pairs,
  onChange,
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}) {
  const { t } = useTranslation();
  const update = (index: number, field: string, value: string | boolean) => {
    const updated = pairs.map((p, i) =>
      i === index ? { ...p, [field]: value } : p,
    );
    onChange(updated);
  };

  const addRow = () => {
    onChange([...pairs, { id: formKvId(), key: "", value: "", enabled: true }]);
  };

  const removeRow = (index: number) => {
    if (pairs.length <= 1) {
      onChange([{ id: formKvId(), key: "", value: "", enabled: true }]);
      return;
    }
    onChange(pairs.filter((_, i) => i !== index));
  };

  const pickFile = async (index: number) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ multiple: false });
      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        const updated = pairs.map((p, i) =>
          i === index ? { ...p, value: path as string, valueType: "file" as const } : p,
        );
        onChange(updated);
      }
    } catch {
      // dialog cancelled
    }
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-2 px-1 text-xs text-[var(--color-text-muted)]">
        <span className="w-5" />
        <span>{t("request.field")}</span>
        <span>{t("request.value")}</span>
        <span className="w-7" />
        <span className="w-7" />
      </div>

      {pairs.map((pair, index) => (
        <div
          key={pair.id}
          className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-2 px-1"
        >
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => update(index, "enabled", e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          <input
            type="text"
            value={pair.key}
            onChange={(e) => update(index, "key", e.target.value)}
            placeholder={t("request.field")}
            className="rounded bg-[var(--color-elevated)] px-2 py-1 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={pair.value}
              onChange={(e) => {
                const updated = pairs.map((p, i) =>
                  i === index ? { ...p, value: e.target.value, valueType: undefined } : p,
                );
                onChange(updated);
              }}
              placeholder={pair.valueType === "file" ? t("request.filePath") : t("request.value")}
              className={`min-w-0 flex-1 rounded bg-[var(--color-elevated)] px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 ${
                pair.valueType === "file"
                  ? "text-violet-400 placeholder-violet-400/50"
                  : "text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)]"
              }`}
            />
            <button
              onClick={() => pickFile(index)}
              className={`shrink-0 rounded p-1 transition-colors ${
                pair.valueType === "file"
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              }`}
              title={t("request.embedFileContent")}
            >
              <FileUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => removeRow(index)}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <button
        onClick={addRow}
        className="flex items-center gap-1 px-1 pt-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
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
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          {t("request.preRequest")}
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
          {t("request.postResponse")}
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
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
          {t("request.assertions")}
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
          {t("request.testScript")}
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
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {/* Body type selector */}
      <div className="flex gap-2">
        {BODY_TYPE_IDS.map((btId) => (
          <button
            key={btId}
            onClick={() => onChange({ ...body, type: btId })}
            className={`rounded px-3 py-1 text-xs transition-colors ${
              body.type === btId
                ? "bg-blue-600 text-white"
                : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t(BODY_TYPE_LABEL_KEYS[btId])}
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

      {body.type === "urlencoded" && (
        <KeyValueEditor
          pairs={body.formData.length > 0 ? body.formData : [{ id: `kv_formdata_${Date.now()}`, key: "", value: "", enabled: true }]}
          onChange={(formData) => onChange({ ...body, formData })}
          keyPlaceholder="Field"
          valuePlaceholder={t("request.value")}
        />
      )}

      {body.type === "form-data" && (
        <FormDataEditor
          pairs={body.formData.length > 0 ? body.formData : [{ id: `kv_formdata_${Date.now()}`, key: "", value: "", enabled: true }]}
          onChange={(formData) => onChange({ ...body, formData })}
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
  const { t } = useTranslation();
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
            case "saml":
              onChange({
                type: "saml",
                idpUrl: "",
                entityId: "",
                assertionConsumerUrl: "",
                certificate: "",
                nameIdFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                samlToken: "",
              });
              break;
          }
        }}
        className={SELECT_CLASS}
      >
        <option value="none">{t("auth.none")}</option>
        <option value="bearer">{t("auth.bearer")}</option>
        <option value="basic">{t("auth.basic")}</option>
        <option value="api-key">{t("auth.apiKey")}</option>
        <option value="oauth2">{t("auth.oauth2")}</option>
        <option value="digest">{t("auth.digest")}</option>
        <option value="aws-v4">{t("auth.awsV4")}</option>
        <option value="jwt-bearer">{t("auth.jwtBearer")}</option>
        <option value="ntlm">{t("auth.ntlm")}</option>
        <option value="saml">{t("auth.saml")}</option>
      </select>

      {/* Auth fields */}
      {auth.type === "bearer" && (
        <input
          type="text"
          value={auth.token}
          onChange={(e) => onChange({ ...auth, token: e.target.value })}
          placeholder={t("auth.token")}
          className={INPUT_CLASS}
        />
      )}

      {auth.type === "basic" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.username}
            onChange={(e) => onChange({ ...auth, username: e.target.value })}
            placeholder={t("auth.username")}
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) => onChange({ ...auth, password: e.target.value })}
            placeholder={t("auth.password")}
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
            placeholder={t("request.value")}
            className={INPUT_CLASS}
          />
          <select
            value={auth.addTo}
            onChange={(e) =>
              onChange({ ...auth, addTo: e.target.value as "header" | "query" })
            }
            className={SELECT_CLASS}
          >
            <option value="header">{t("auth.addToHeader")}</option>
            <option value="query">{t("auth.addToQuery")}</option>
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
            placeholder={t("auth.username")}
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) => onChange({ ...auth, password: e.target.value })}
            placeholder={t("auth.password")}
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
            placeholder={t("auth.accessKey")}
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.secretKey}
            onChange={(e) => onChange({ ...auth, secretKey: e.target.value })}
            placeholder={t("auth.secretKey")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.region}
            onChange={(e) => onChange({ ...auth, region: e.target.value })}
            placeholder={t("auth.region")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.service}
            onChange={(e) => onChange({ ...auth, service: e.target.value })}
            placeholder={t("auth.service")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.sessionToken}
            onChange={(e) => onChange({ ...auth, sessionToken: e.target.value })}
            placeholder={t("auth.sessionToken")}
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
            placeholder={t("auth.headerPrefix")}
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
            placeholder={t("auth.username")}
            className={INPUT_CLASS}
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) => onChange({ ...auth, password: e.target.value })}
            placeholder={t("auth.password")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.domain}
            onChange={(e) => onChange({ ...auth, domain: e.target.value })}
            placeholder={t("auth.domain")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.workstation}
            onChange={(e) => onChange({ ...auth, workstation: e.target.value })}
            placeholder={t("auth.workstation")}
            className={INPUT_CLASS}
          />
        </div>
      )}

      {auth.type === "saml" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.idpUrl}
            onChange={(e) => onChange({ ...auth, idpUrl: e.target.value })}
            placeholder={t("auth.idpUrl")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.entityId}
            onChange={(e) => onChange({ ...auth, entityId: e.target.value })}
            placeholder={t("auth.entityId")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.assertionConsumerUrl}
            onChange={(e) => onChange({ ...auth, assertionConsumerUrl: e.target.value })}
            placeholder={t("auth.assertionConsumerUrl")}
            className={INPUT_CLASS}
          />
          <textarea
            value={auth.certificate}
            onChange={(e) => onChange({ ...auth, certificate: e.target.value })}
            placeholder={t("auth.certificate")}
            rows={3}
            className={INPUT_CLASS + " resize-y font-mono"}
          />
          <input
            type="text"
            value={auth.nameIdFormat}
            onChange={(e) => onChange({ ...auth, nameIdFormat: e.target.value })}
            placeholder={t("auth.nameIdFormat")}
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={auth.samlToken}
            onChange={(e) => onChange({ ...auth, samlToken: e.target.value })}
            placeholder={t("auth.samlToken")}
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
  const { t } = useTranslation();
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
        <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.grantType")}</span>
        <select
          value={auth.grantType}
          onChange={(e) =>
            onChange({ ...auth, grantType: e.target.value as OAuth2GrantType })
          }
          className={SELECT_CLASS + " w-full"}
        >
          <option value="authorization_code">{t("auth.authorizationCode")}</option>
          <option value="client_credentials">{t("auth.clientCredentials")}</option>
          <option value="implicit">{t("auth.implicit")}</option>
          <option value="password">{t("auth.passwordGrant")}</option>
        </select>
      </label>

      {/* Auth URL */}
      {showAuthUrl && (
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.authUrl")}</span>
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
          <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.tokenUrl")}</span>
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
          <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.clientId")}</span>
          <input
            type="text"
            value={auth.clientId}
            onChange={(e) => onChange({ ...auth, clientId: e.target.value })}
            placeholder={t("auth.clientId")}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.clientSecret")}</span>
          <input
            type="password"
            value={auth.clientSecret}
            onChange={(e) => onChange({ ...auth, clientSecret: e.target.value })}
            placeholder={t("auth.clientSecret")}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      {/* Scope */}
      <label className="block">
        <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.scope")}</span>
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
            <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.username")}</span>
            <input
              type="text"
              value={auth.username}
              onChange={(e) => onChange({ ...auth, username: e.target.value })}
              placeholder={t("auth.username")}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.password")}</span>
            <input
              type="password"
              value={auth.password}
              onChange={(e) => onChange({ ...auth, password: e.target.value })}
              placeholder={t("auth.password")}
              className={INPUT_CLASS}
            />
          </label>
        </div>
      )}

      {/* Callback URL */}
      {showAuthUrl && (
        <label className="block">
          <span className="text-xs text-[var(--color-text-secondary)]">{t("auth.callbackUrl")}</span>
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
          {t("auth.usePkce")}
        </label>
      )}

      {/* Token Status & Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleGetToken}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t("auth.authenticating") : t("auth.getToken")}
        </button>
        {tokenStatus?.hasToken && (
          <button
            onClick={handleClearToken}
            className="rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {t("auth.clearToken")}
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
            ? t("auth.tokenExpired")
            : tokenStatus.expiresAt
              ? `${t("auth.tokenValid")} (expires ${new Date(tokenStatus.expiresAt * 1000).toLocaleTimeString()})`
              : `${t("auth.tokenValid")} (no expiry)`}
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
