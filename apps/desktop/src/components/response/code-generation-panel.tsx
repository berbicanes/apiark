import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import { useActiveTab } from "@/stores/tab-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { generateCurl, generateJsFetch, generatePythonRequests } from "@/lib/code-generators";
import { variableRegex } from "@/lib/variables";
import type { Tab } from "@apiark/types";

type Language = "curl" | "javascript" | "python";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "curl", label: "cURL" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
];

/** Replace all {{varName}} in a string with resolved values */
function resolveVariables(str: string, vars: Record<string, string>): string {
  return str.replace(variableRegex(), (_, name) => vars[name] ?? `{{${name}}}`);
}

/** Replace :paramName path variables in a URL with their values */
function resolvePathVariables(url: string, pathVars: Record<string, string>): string {
  let resolved = url;
  for (const [key, value] of Object.entries(pathVars)) {
    if (value) {
      resolved = resolved.replace(new RegExp(`:${key}\\b`, "g"), encodeURIComponent(value));
    }
  }
  return resolved;
}

/** Create a copy of the tab with all variables resolved */
function resolveTab(tab: Tab, vars: Record<string, string>): Tab {
  // For GraphQL tabs, build the JSON body from tab.graphql
  let body = tab.body;
  let method = tab.method;
  let headers = tab.headers;
  if (tab.protocol === "graphql" && tab.graphql) {
    method = "POST";
    const gqlBody: Record<string, unknown> = { query: tab.graphql.query };
    try {
      const v = JSON.parse(tab.graphql.variables);
      if (Object.keys(v).length > 0) gqlBody.variables = v;
    } catch { /* ignore */ }
    if (tab.graphql.operationName) gqlBody.operationName = tab.graphql.operationName;
    body = { type: "json", content: JSON.stringify(gqlBody, null, 2), formData: [] };
    // Ensure Content-Type header
    if (!headers.some((h) => h.key.toLowerCase() === "content-type" && h.enabled)) {
      headers = [{ id: "ct", key: "Content-Type", value: "application/json", enabled: true }, ...headers];
    }
  }

  return {
    ...tab,
    method,
    url: resolveVariables(resolvePathVariables(tab.url, tab.pathVariables), vars),
    headers: headers.map((h) => ({
      ...h,
      key: resolveVariables(h.key, vars),
      value: resolveVariables(h.value, vars),
    })),
    params: tab.params.map((p) => ({
      ...p,
      key: resolveVariables(p.key, vars),
      value: resolveVariables(p.value, vars),
    })),
    body: {
      ...body,
      content: resolveVariables(body.content, vars),
    },
    auth: tab.auth.type === "bearer"
      ? { ...tab.auth, token: resolveVariables(tab.auth.token, vars) }
      : tab.auth.type === "api-key"
        ? { ...tab.auth, key: resolveVariables(tab.auth.key, vars), value: resolveVariables(tab.auth.value, vars) }
        : tab.auth,
  };
}

export function CodeGenerationPanel() {
  const { t } = useTranslation();
  const tab = useActiveTab();
  const [language, setLanguage] = useState<Language>("curl");
  const [copied, setCopied] = useState(false);
  const [resolvedVars, setResolvedVars] = useState<Record<string, string>>({});
  const activeEnvName = useEnvironmentStore((s) => s.activeEnvironmentName);

  useEffect(() => {
    useEnvironmentStore.getState().getResolvedVariables()
      .then(setResolvedVars)
      .catch(() => setResolvedVars({}));
  }, [tab?.url, tab?.headers, tab?.body.content, activeEnvName]);

  const code = useMemo(() => {
    if (!tab) return "";
    const resolved = resolveTab(tab, resolvedVars);
    switch (language) {
      case "curl":
        return generateCurl(resolved);
      case "javascript":
        return generateJsFetch(resolved);
      case "python":
        return generatePythonRequests(resolved);
    }
  }, [tab, language, resolvedVars]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tab) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Language selector */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                language === lang.value
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              {t("common.copy")}
            </>
          )}
        </button>
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-auto p-3">
        <pre className="whitespace-pre-wrap break-all font-mono text-sm text-[var(--color-text-primary)]">
          {code}
        </pre>
      </div>
    </div>
  );
}
