import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { KeyValueEditor } from "@/components/request/key-value-editor";
import { ResponsePanel } from "@/components/response/response-panel";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Download,
  Plug,
  Unplug,
  Trash2,
  ArrowDown,
  Loader2,
} from "lucide-react";
import type { AuthConfig } from "@apiark/types";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { UrlBar } from "@/components/request/url-bar";
import {
  useGraphQLSubscription,
  type GqlSubscriptionMessage,
} from "@/hooks/use-graphql-subscription";

type GqlTab = "query" | "variables" | "headers" | "auth";

const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      description
      fields(includeDeprecated: false) {
        name
        type { name kind ofType { name kind } }
      }
    }
    queryType { name }
    mutationType { name }
    subscriptionType { name }
  }
}`;

function isSubscriptionQuery(query: string): boolean {
  // Strip comments and find the first operation keyword
  const stripped = query
    .replace(/#[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^\s*subscription\b/i.test(stripped);
}

export function GraphQLView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<GqlTab>("query");
  const [schemaTypes, setSchemaTypes] = useState<
    { name: string; kind: string }[]
  >([]);
  const [fetchingSchema, setFetchingSchema] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const tab = useActiveTab();
  const {
    setHeaders,
    setAuth,
    setGraphQLQuery,
    setGraphQLVariables,
    setGraphQLOperationName,
    setGraphQLSchema,
    send,
  } = useTabStore();

  const connectionId = tab ? `gql-sub-${tab.id}` : "";
  const {
    status: subStatus,
    messages: subMessages,
    error: subError,
    subscribe,
    unsubscribe,
    clearMessages,
  } = useGraphQLSubscription(connectionId);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [subMessages, autoScroll]);

  if (!tab || !tab.graphql) return null;

  const isSubscription = isSubscriptionQuery(tab.graphql.query);

  const handleFetchSchema = async () => {
    if (!tab.url.trim()) return;
    setFetchingSchema(true);
    const originalQuery = tab.graphql!.query;
    setGraphQLQuery(INTROSPECTION_QUERY);
    setGraphQLOperationName("IntrospectionQuery");
    await send();
    setGraphQLQuery(originalQuery);
    setGraphQLOperationName(tab.graphql!.operationName);

    const updated = useTabStore
      .getState()
      .tabs.find((t) => t.id === tab.id);
    if (updated?.response?.body) {
      try {
        const data = JSON.parse(updated.response.body);
        const types =
          data?.data?.__schema?.types?.filter(
            (t: { name: string }) => !t.name.startsWith("__"),
          ) ?? [];
        setSchemaTypes(types);
        setGraphQLSchema(updated.response.body);
      } catch {
        setSchemaTypes([]);
      }
    }
    setFetchingSchema(false);
  };

  const handleSubscribe = () => {
    if (subStatus === "subscribed" || subStatus === "connected") {
      unsubscribe();
    } else {
      const headers = tab.headers.filter(
        (h) => h.key.trim() && h.enabled,
      );
      subscribe(
        tab.url,
        tab.graphql!.query,
        tab.graphql!.variables,
        tab.graphql!.operationName,
        headers,
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Breadcrumb />
      <UrlBar
        extraActions={
          <div className="flex items-center gap-1">
            <button
              onClick={handleFetchSchema}
              disabled={fetchingSchema || !tab.url.trim()}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-elevated)] px-2.5 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] disabled:opacity-50"
              title={t("graphql.fetchSchema")}
            >
              <Download className="h-3 w-3" />
              {fetchingSchema
                ? t("graphql.fetchingSchema")
                : t("graphql.schema")}
            </button>
            {isSubscription && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    subStatus === "subscribed"
                      ? "bg-green-500"
                      : subStatus === "connecting" || subStatus === "connected"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-gray-500"
                  }`}
                />
                <span className="text-xs text-[var(--color-text-muted)] capitalize">
                  {subStatus}
                </span>
              </div>
            )}
          </div>
        }
        sendButton={
          isSubscription ? (
            <button
              onClick={handleSubscribe}
              disabled={
                subStatus === "connecting" || !tab.url.trim()
              }
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                subStatus === "subscribed" || subStatus === "connected"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {subStatus === "subscribed" || subStatus === "connected" ? (
                <>
                  <Unplug className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" />
                  {subStatus === "connecting"
                    ? "Connecting..."
                    : "Subscribe"}
                </>
              )}
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Query editor */}
        <div className="flex min-h-0 w-1/2 flex-col border-r border-[var(--color-border)]">
          <div className="flex shrink-0 gap-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {(["query", "variables", "headers", "auth"] as const).map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-sm capitalize transition-colors ${
                    activeTab === t
                      ? "border-b-2 border-purple-500 text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  {t}
                </button>
              ),
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            {activeTab === "query" && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex shrink-0 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {t("graphql.query")}
                    </label>
                    {isSubscription && (
                      <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">
                        SUBSCRIPTION
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={tab.graphql.operationName}
                    onChange={(e) =>
                      setGraphQLOperationName(e.target.value)
                    }
                    placeholder={t("graphql.operationName")}
                    className="rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
                  />
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={tab.graphql.query}
                    onChange={(v) => setGraphQLQuery(v)}
                    language="graphql"
                    height="100%"
                    placeholder="subscription { messageAdded { id text } }"
                  />
                </div>
              </div>
            )}

            {activeTab === "variables" && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">
                  {t("graphql.variablesJson")}
                </label>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={tab.graphql.variables}
                    onChange={(v) => setGraphQLVariables(v)}
                    language="json"
                    height="100%"
                    placeholder='{ "id": "123" }'
                  />
                </div>
              </div>
            )}

            {activeTab === "headers" && (
              <div className="overflow-auto">
                <KeyValueEditor
                  pairs={tab.headers}
                  onChange={setHeaders}
                  keyPlaceholder={t("request.header")}
                  valuePlaceholder={t("request.value")}
                />
              </div>
            )}

            {activeTab === "auth" && (
              <div className="overflow-auto">
                <AuthEditorCompact
                  auth={tab.auth}
                  onChange={setAuth}
                />
              </div>
            )}
          </div>

          {schemaTypes.length > 0 && (
            <div className="max-h-32 overflow-auto border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
                Schema Types ({schemaTypes.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {schemaTypes.slice(0, 50).map((t) => (
                  <span
                    key={t.name}
                    className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                    title={t.kind}
                  >
                    {t.name}
                  </span>
                ))}
                {schemaTypes.length > 50 && (
                  <span className="text-[10px] text-[var(--color-text-dimmed)]">
                    +{schemaTypes.length - 50} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Response / Subscription messages */}
        <div className="flex w-1/2 flex-col">
          {isSubscription ? (
            <SubscriptionPanel
              status={subStatus}
              messages={subMessages}
              error={subError}
              autoScroll={autoScroll}
              setAutoScroll={setAutoScroll}
              clearMessages={clearMessages}
              logRef={logRef}
            />
          ) : (
            <ResponsePanel />
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionPanel({
  status,
  messages,
  error,
  autoScroll,
  setAutoScroll,
  clearMessages,
  logRef,
}: {
  status: string;
  messages: GqlSubscriptionMessage[];
  error: string | null;
  autoScroll: boolean;
  setAutoScroll: (v: boolean) => void;
  clearMessages: () => void;
  logRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Error */}
      {error && (
        <div className="border-b border-[var(--color-border)] bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-3">
          {status === "subscribed" ? (
            <span className="flex items-center gap-1.5 text-green-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Listening...
            </span>
          ) : (
            <span>
              {status === "disconnected"
                ? "Write a subscription query and click Subscribe"
                : status}
            </span>
          )}
          <span>Messages: {messages.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3"
            />
            Auto-scroll
          </label>
          <button
            onClick={clearMessages}
            className="rounded p-1 hover:bg-[var(--color-elevated)]"
            title="Clear messages"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={logRef} className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-[var(--color-text-dimmed)]">
            {status === "subscribed"
              ? "Waiting for events..."
              : "Subscribe to start receiving events"}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="border-b border-[var(--color-border)] px-3 py-2"
            >
              <div className="mb-1 flex items-center gap-2">
                <ArrowDown className="h-3 w-3 text-purple-500" />
                <span className="text-[10px] text-[var(--color-text-dimmed)]">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.errors && (
                  <span className="rounded bg-red-500/15 px-1 py-0.5 text-[10px] text-red-400">
                    error
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap break-all font-mono text-xs text-[var(--color-text-primary)]">
                {msg.data}
              </pre>
              {msg.errors && (
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-red-400">
                  {msg.errors}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AuthEditorCompact({
  auth,
  onChange,
}: {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
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
              onChange({
                type: "api-key",
                key: "",
                value: "",
                addTo: "header",
              });
              break;
          }
        }}
        className="rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-purple-500"
      >
        <option value="none">{t("auth.none")}</option>
        <option value="bearer">{t("auth.bearer")}</option>
        <option value="basic">{t("auth.basic")}</option>
        <option value="api-key">{t("auth.apiKey")}</option>
      </select>

      {auth.type === "bearer" && (
        <input
          type="text"
          value={auth.token}
          onChange={(e) => onChange({ ...auth, token: e.target.value })}
          placeholder={t("auth.token")}
          className="w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-purple-500"
        />
      )}

      {auth.type === "basic" && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.username}
            onChange={(e) =>
              onChange({ ...auth, username: e.target.value })
            }
            placeholder={t("auth.username")}
            className="w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
          />
          <input
            type="password"
            value={auth.password}
            onChange={(e) =>
              onChange({ ...auth, password: e.target.value })
            }
            placeholder={t("auth.password")}
            className="w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
          />
        </div>
      )}
    </div>
  );
}
