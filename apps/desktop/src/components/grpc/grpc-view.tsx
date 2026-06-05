import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { grpcLoadProto, grpcReflectServices, grpcCallUnary, grpcCallServerStream, grpcCallClientStream, grpcCallBidiStream } from "@/lib/tauri-api";
import { open } from "@tauri-apps/plugin-dialog";
import type { GrpcState, GrpcMethodInfo, GrpcServiceInfo } from "@apiark/types";
import { CodeEditor } from "@/components/ui/code-editor";
import { Upload, Radio, Send, Loader2, Trash2, ArrowDown, ArrowUp, Plus, X, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { UrlBar } from "@/components/request/url-bar";
import { KeyValueEditor } from "@/components/request/key-value-editor";

interface StreamMessage {
  body: string;
  index: number;
  timeMs: number;
  direction?: "sent" | "received";
}

/** gRPC state fields that are persisted to the request file. A patch touching
 * any of these marks the tab dirty; ephemeral fields (services, loading,
 * response, error) do not. */
const PERSISTABLE_GRPC_KEYS: ReadonlyArray<keyof GrpcState> = [
  "selectedService",
  "selectedMethod",
  "requestJson",
  "metadata",
];

const CALL_TYPE_ORDER = ["unary", "serverStreaming", "clientStreaming", "bidiStreaming"] as const;

const CALL_TYPE_GROUP_LABELS: Record<string, string> = {
  unary: "Unary",
  serverStreaming: "Server Streaming",
  clientStreaming: "Client Streaming",
  bidiStreaming: "Bidirectional Streaming",
};

export function GrpcView() {
  const { t } = useTranslation();
  const tab = useActiveTab();
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [clientMessages, setClientMessages] = useState<string[]>(['{}']);
  const [methodFilter, setMethodFilter] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [showResponseMeta, setShowResponseMeta] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamMessages, autoScroll]);

  // Listen for stream events
  useEffect(() => {
    if (!tab) return;
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ type: string; body?: string; index?: number; timeMs?: number; message?: string; messageCount?: number }>(
          `grpc:stream:${tab.id}`,
          (event) => {
            if (cancelled) return;
            const data = event.payload;
            if (data.type === "message" && data.body !== undefined) {
              setStreamMessages((prev) => [
                ...prev,
                { body: data.body!, index: data.index ?? prev.length, timeMs: data.timeMs ?? 0, direction: "received" as const },
              ]);
            } else if (data.type === "sent") {
              setStreamMessages((prev) => [
                ...prev,
                { body: "", index: data.index ?? prev.length, timeMs: data.timeMs ?? 0, direction: "sent" as const },
              ]);
            } else if (data.type === "complete") {
              setStreaming(false);
            } else if (data.type === "error") {
              setStreaming(false);
            }
          },
        );
      } catch {
        // Not in Tauri env
      }
    };
    setup();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [tab?.id]);

  if (!tab || tab.protocol !== "grpc" || !tab.grpc) {
    return null;
  }

  const grpc = tab.grpc;

  const updateGrpc = (patch: Partial<GrpcState>) => {
    // Only edits to persistable fields mark the tab dirty (which reveals the
    // Save button). Ephemeral updates — loading/response/error, and the
    // services discovered by Reflect — must not, mirroring how HTTP sending
    // never dirties the tab. Reflect still dirties via selectedService/Method.
    const marksDirty = PERSISTABLE_GRPC_KEYS.some((k) => k in patch);
    useTabStore.setState((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId && t.grpc
          ? { ...t, ...(marksDirty ? { isDirty: true } : {}), grpc: { ...t.grpc!, ...patch } }
          : t,
      ),
    }));
  };

  // Build the patch for selecting a method: switch the method and, when the
  // request body is still blank, pre-fill it with the method's generated
  // example JSON (like Postman does) so the user sees the expected fields.
  const selectMethodPatch = (
    svc: GrpcServiceInfo | undefined,
    methodName: string | null,
  ): Partial<GrpcState> => {
    const mtd = svc?.methods.find((m) => m.name === methodName);
    const patch: Partial<GrpcState> = { selectedMethod: methodName };
    const methodChanged = methodName !== grpc.selectedMethod;
    if (mtd?.exampleJson && (methodChanged || isBlankJson(grpc.requestJson))) {
      patch.requestJson = tryFormatJson(mtd.exampleJson);
    }
    return patch;
  };

  const handleLoadProto = async () => {
    try {
      const selected = await open({
        filters: [{ name: "Proto Files", extensions: ["proto"] }],
        multiple: false,
      });
      if (!selected) return;

      const services = await grpcLoadProto(tab.id, selected as string);
      const svc = services[0];
      updateGrpc({
        services,
        selectedService: svc?.fullName ?? null,
        ...selectMethodPatch(svc, svc?.methods[0]?.name ?? null),
        error: null,
      });
    } catch (err) {
      updateGrpc({ error: String(err) });
    }
  };

  const handleReflect = async () => {
    if (!tab.url.trim()) {
      updateGrpc({ error: t("grpc.reflectNeedsAddress", { defaultValue: "Enter a server address first." }) });
      return;
    }
    setReflecting(true);
    updateGrpc({ error: null });
    try {
      const services = await grpcReflectServices(tab.id, tab.url);
      if (services.length === 0) {
        updateGrpc({ error: t("grpc.reflectNoServices", { defaultValue: "The server exposed no services via reflection." }) });
        return;
      }
      // Prefer the previously selected service if the server still exposes it,
      // otherwise fall back to the first one returned by reflection.
      const svc = services.find((s) => s.fullName === grpc.selectedService) ?? services[0];
      const method = svc?.methods.find((m) => m.name === grpc.selectedMethod)?.name ?? svc?.methods[0]?.name ?? null;
      updateGrpc({
        services,
        selectedService: svc?.fullName ?? null,
        ...selectMethodPatch(svc, method),
        error: null,
      });
    } catch (err) {
      updateGrpc({ error: String(err) });
    } finally {
      setReflecting(false);
    }
  };

  const selectedSvc = grpc.services.find((s) => s.fullName === grpc.selectedService);
  const selectedMtd = selectedSvc?.methods.find((m) => m.name === grpc.selectedMethod);
  const callType = selectedMtd?.callType ?? "unary";
  const isServerStream = callType === "serverStreaming";
  const isClientStream = callType === "clientStreaming";
  const isBidiStream = callType === "bidiStreaming";
  const hasStreamResponse = isServerStream || isBidiStream;
  const hasStreamRequest = isClientStream || isBidiStream;

  const handleSend = async () => {
    if (!grpc.selectedService || !grpc.selectedMethod) return;

    const metadata = grpc.metadata
      .filter((m) => m.key.trim() && m.enabled)
      .map((m) => ({ key: m.key, value: m.value }));

    setStreamMessages([]);
    updateGrpc({ loading: true, error: null, response: null });

    try {
      if (isServerStream) {
        setStreaming(true);
        await grpcCallServerStream(
          tab.id, tab.url, grpc.selectedService, grpc.selectedMethod,
          grpc.requestJson, metadata,
        );
        updateGrpc({ loading: false });
      } else if (isClientStream) {
        setStreaming(true);
        const response = await grpcCallClientStream(
          tab.id, tab.url, grpc.selectedService, grpc.selectedMethod,
          clientMessages.filter((m) => m.trim()), metadata,
        );
        updateGrpc({ response, loading: false });
        setStreaming(false);
      } else if (isBidiStream) {
        setStreaming(true);
        const response = await grpcCallBidiStream(
          tab.id, tab.url, grpc.selectedService, grpc.selectedMethod,
          clientMessages.filter((m) => m.trim()), metadata,
        );
        updateGrpc({ response, loading: false });
      } else {
        const response = await grpcCallUnary(
          tab.id, tab.url, grpc.selectedService, grpc.selectedMethod,
          grpc.requestJson, metadata,
        );
        updateGrpc({ response, loading: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : String(err);
      updateGrpc({ error: msg, loading: false });
      setStreaming(false);
    }
  };

  const metadataCount = grpc.metadata.filter((m) => m.key.trim()).length;
  const responseMetadata = grpc.response?.metadata ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Breadcrumb />
      <UrlBar
        extraActions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReflect}
              disabled={reflecting}
              title={t("grpc.reflectHint", { defaultValue: "Discover services from a reflection-enabled server" })}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-elevated)] px-2.5 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reflecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
              {t("grpc.reflect", { defaultValue: "Reflect" })}
            </button>
            <button
              onClick={handleLoadProto}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-elevated)] px-2.5 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            >
              <Upload className="h-3 w-3" />
              {t("grpc.loadProto")}
            </button>
          </div>
        }
        sendButton={
          <button
            onClick={handleSend}
            disabled={grpc.loading || !grpc.selectedMethod}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {grpc.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("request.send")}
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: service/method selection + metadata + request */}
        <div className="flex w-1/2 flex-col border-r border-[var(--color-border)]">
          {/* Service selector */}
          {grpc.services.length > 0 && (
            <div className="border-b border-[var(--color-border)] px-3 py-2">
              <select
                value={grpc.selectedService ?? ""}
                onChange={(e) => {
                  const svc = grpc.services.find((s) => s.fullName === e.target.value);
                  updateGrpc({
                    selectedService: e.target.value,
                    ...selectMethodPatch(svc, svc?.methods[0]?.name ?? null),
                  });
                  setMethodFilter("");
                }}
                className="w-full rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {grpc.services.map((s) => (
                  <option key={s.fullName} value={s.fullName}>{s.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Method browser */}
          {selectedSvc && selectedSvc.methods.length > 0 && (
            <MethodBrowser
              methods={selectedSvc.methods}
              selectedMethod={grpc.selectedMethod}
              onSelectMethod={(name) => updateGrpc(selectMethodPatch(selectedSvc, name))}
              filter={methodFilter}
              onFilterChange={setMethodFilter}
            />
          )}

          {/* Metadata (collapsible) */}
          <div className="border-b border-[var(--color-border)]">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex w-full items-center gap-1 px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              {showMetadata ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Metadata
              {metadataCount > 0 && (
                <span className="text-[10px]">({metadataCount})</span>
              )}
            </button>
            {showMetadata && (
              <div className="px-3 pb-2">
                <KeyValueEditor
                  pairs={grpc.metadata}
                  onChange={(pairs) => updateGrpc({ metadata: pairs })}
                  keyPlaceholder="Key"
                  valuePlaceholder="Value"
                />
              </div>
            )}
          </div>

          {/* Request JSON editor */}
          <div className="flex-1 overflow-auto p-3">
            {hasStreamRequest ? (
              /* Multi-message input for client/bidi streaming */
              <>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">
                    Messages ({clientMessages.length})
                  </label>
                  <button
                    onClick={() => setClientMessages([...clientMessages, "{}"])}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {clientMessages.map((msg, i) => (
                    <div key={i} className="relative">
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-text-dimmed)]">
                          Message #{i + 1}
                        </span>
                        {clientMessages.length > 1 && (
                          <button
                            onClick={() => setClientMessages(clientMessages.filter((_, j) => j !== i))}
                            className="rounded p-0.5 text-[var(--color-text-dimmed)] hover:text-red-400"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                      <CodeEditor
                        value={msg}
                        onChange={(v) => {
                          const updated = [...clientMessages];
                          updated[i] = v;
                          setClientMessages(updated);
                        }}
                        language="json"
                        height="90px"
                        placeholder='{ "field": "value" }'
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Single message input for unary/server streaming */
              <div className="flex h-full flex-col">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                  {t("grpc.requestBody")}
                </label>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={grpc.requestJson}
                    onChange={(v) => updateGrpc({ requestJson: v })}
                    language="json"
                    height="100%"
                    placeholder='{ "field": "value" }'
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: response */}
        <div className="flex w-1/2 flex-col">
          {grpc.error ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <p className="text-sm text-red-400">{grpc.error}</p>
            </div>
          ) : hasStreamResponse && (streaming || streamMessages.length > 0) ? (
            /* Streaming response view */
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
                <div className="flex items-center gap-2">
                  {streaming ? (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Streaming...
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-green-500">
                      Stream complete
                    </span>
                  )}
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {streamMessages.length} message{streamMessages.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer text-xs text-[var(--color-text-muted)]">
                    <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="h-3 w-3" />
                    Auto-scroll
                  </label>
                  <button
                    onClick={() => setStreamMessages([])}
                    className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div ref={logRef} className="flex-1 overflow-auto">
                {streamMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`border-b border-[var(--color-border)] px-3 py-2 ${
                      msg.direction === "sent" ? "bg-green-500/5" : ""
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {msg.direction === "sent" ? (
                        <ArrowUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-blue-500" />
                      )}
                      <span className="text-[10px] text-[var(--color-text-dimmed)]">
                        #{msg.index} · {msg.timeMs}ms · {msg.direction ?? "received"}
                      </span>
                    </div>
                    {msg.body && (
                      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-[var(--color-text-primary)]">
                        {tryFormatJson(msg.body)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : grpc.response ? (
            /* Unary response view */
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <span className={`text-sm font-semibold ${grpc.response.statusCode === 0 ? "text-green-500" : "text-red-400"}`}>
                  {grpc.response.statusCode === 0 ? "OK" : `Error ${grpc.response.statusCode}`}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{grpc.response.timeMs}ms</span>
              </div>

              {/* Response metadata/trailers */}
              {responseMetadata.length > 0 && (
                <div className="border-b border-[var(--color-border)]">
                  <button
                    onClick={() => setShowResponseMeta(!showResponseMeta)}
                    className="flex w-full items-center gap-1 px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  >
                    {showResponseMeta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Response Metadata
                    <span className="text-[10px]">({responseMetadata.length})</span>
                  </button>
                  {showResponseMeta && (
                    <div className="px-3 pb-2">
                      <div className="space-y-0.5">
                        {responseMetadata.map((entry, i) => (
                          <div key={i} className="grid grid-cols-[1fr_2fr] gap-2 text-xs">
                            <span className="truncate font-medium text-[var(--color-text-secondary)]">{entry.key}</span>
                            <span className="truncate font-mono text-[var(--color-text-primary)]">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-auto p-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-sm text-[var(--color-text-primary)]">
                  {tryFormatJson(grpc.response.body)}
                </pre>
              </div>
            </div>
          ) : grpc.loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                Sending gRPC request...
              </div>
            </div>
          ) : grpc.services.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-dimmed)]">
              {t("grpc.loadProtoToStart")}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-dimmed)]">
              {t("grpc.selectMethodToSend")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Method browser with search filter and call-type grouping */
function MethodBrowser({
  methods,
  selectedMethod,
  onSelectMethod,
  filter,
  onFilterChange,
}: {
  methods: GrpcMethodInfo[];
  selectedMethod: string | null;
  onSelectMethod: (name: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  const showFilter = methods.length > 5;

  const filtered = useMemo(() => {
    if (!filter.trim()) return methods;
    const lower = filter.toLowerCase();
    return methods.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.inputType.toLowerCase().includes(lower) ||
        m.outputType.toLowerCase().includes(lower),
    );
  }, [methods, filter]);

  // Group by call type
  const grouped = useMemo(() => {
    const groups: Record<string, GrpcMethodInfo[]> = {};
    for (const m of filtered) {
      const ct = m.callType;
      if (!groups[ct]) groups[ct] = [];
      groups[ct].push(m);
    }
    return groups;
  }, [filtered]);

  const sortedTypes = CALL_TYPE_ORDER.filter((ct) => grouped[ct] && grouped[ct].length > 0);

  return (
    <div className="border-b border-[var(--color-border)]">
      {/* Search filter */}
      {showFilter && (
        <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] px-3 py-1.5">
          <Search className="h-3 w-3 text-[var(--color-text-dimmed)]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter methods..."
            className="flex-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
          />
          {filter && (
            <button
              onClick={() => onFilterChange("")}
              className="rounded p-0.5 text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Grouped method list */}
      <div className="max-h-48 overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--color-text-dimmed)]">
            No methods match &quot;{filter}&quot;
          </div>
        ) : (
          sortedTypes.map((ct) => (
            <div key={ct}>
              {/* Group header -- only show if multiple groups */}
              {sortedTypes.length > 1 && (
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dimmed)]">
                  <CallTypeBadge callType={ct} />
                  <span>{CALL_TYPE_GROUP_LABELS[ct]}</span>
                </div>
              )}
              {grouped[ct].map((m) => (
                <button
                  key={m.name}
                  onClick={() => onSelectMethod(m.name)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-elevated)] ${
                    m.name === selectedMethod
                      ? "bg-[var(--color-elevated)] border-l-2 border-l-[var(--color-accent)]"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sortedTypes.length <= 1 && <CallTypeBadge callType={m.callType} />}
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3 pl-0.5 text-[10px] text-[var(--color-text-dimmed)]">
                    <span>
                      <span className="text-[var(--color-text-muted)]">In:</span> {m.inputType}
                    </span>
                    <span>
                      <span className="text-[var(--color-text-muted)]">Out:</span> {m.outputType}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CallTypeBadge({ callType }: { callType: string }) {
  const colors: Record<string, string> = {
    unary: "bg-green-500/15 text-green-400",
    serverStreaming: "bg-blue-500/15 text-blue-400",
    clientStreaming: "bg-amber-500/15 text-amber-400",
    bidiStreaming: "bg-purple-500/15 text-purple-400",
  };
  const labels: Record<string, string> = {
    unary: "Unary",
    serverStreaming: "Server Stream",
    clientStreaming: "Client Stream",
    bidiStreaming: "Bidi Stream",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${colors[callType] ?? "bg-gray-500/15 text-gray-400"}`}>
      {labels[callType] ?? callType}
    </span>
  );
}

/** A request body that carries no user content yet — safe to overwrite with a
 * generated example. */
function isBlankJson(body: string): boolean {
  const trimmed = body.trim();
  return trimmed === "" || trimmed === "{}";
}

function tryFormatJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
