import { useState, useEffect } from "react";
import { useProxyStore } from "@/stores/proxy-store";
import {
  proxyStart,
  proxyStop,
  proxyGetStatus,
  proxyGetCaptures,
  proxyClearCaptures,
  proxySetPassthrough,
  proxyGenerateCa,
  proxyCaExists,
  proxyGetCaCert,
  type CapturedRequest,
} from "@/lib/tauri-api";
import {
  Play,
  Square,
  Trash2,
  Shield,
  ShieldCheck,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  Check,
} from "lucide-react";

export function ProxySidePanel() {
  const { status, setStatus } = useProxyStore();
  const [port, setPort] = useState("8888");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [passthrough, setPassthrough] = useState("");
  const [caExists, setCaExists] = useState(false);
  const [caCopied, setCaCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    proxyGetStatus().then(setStatus).catch(() => {});
    proxyCaExists().then(setCaExists).catch(() => {});
  }, [setStatus]);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (status.running) {
        const s = await proxyStop();
        setStatus(s);
      } else {
        const s = await proxyStart(parseInt(port, 10) || 8888);
        setStatus(s);
      }
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  };

  const handleGenerateCa = async () => {
    try {
      await proxyGenerateCa();
      setCaExists(true);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCopyCaCert = async () => {
    try {
      const pem = await proxyGetCaCert();
      await navigator.clipboard.writeText(pem);
      setCaCopied(true);
      setTimeout(() => setCaCopied(false), 2000);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleUpdatePassthrough = async () => {
    const domains = passthrough
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    try {
      await proxySetPassthrough(domains);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Status */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status.running ? "bg-green-500 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {status.running ? "Running" : "Stopped"}
            </span>
          </div>
          {status.running && (
            <span className="text-xs text-[var(--color-text-muted)]">
              :{status.port}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!status.running && (
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="8888"
              className="w-20 rounded bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 ${
              status.running
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {status.running ? (
              <>
                <Square className="h-3.5 w-3.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Start Proxy
              </>
            )}
          </button>
        </div>

        {status.running && (
          <p className="mt-2 text-[10px] text-[var(--color-text-dimmed)]">
            Configure your HTTP client to use <code>127.0.0.1:{status.port}</code> as proxy
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* CA Certificate */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
        <div className="flex items-center gap-2 mb-2">
          {caExists ? (
            <ShieldCheck className="h-4 w-4 text-green-500" />
          ) : (
            <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
          )}
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            CA Certificate
          </span>
        </div>
        {caExists ? (
          <div className="flex gap-2">
            <button
              onClick={handleCopyCaCert}
              className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            >
              {caCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {caCopied ? "Copied" : "Copy PEM"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateCa}
            className="flex w-full items-center justify-center gap-1.5 rounded bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
          >
            <Download className="h-3 w-3" />
            Generate CA
          </button>
        )}
        <p className="mt-1.5 text-[10px] text-[var(--color-text-dimmed)]">
          Install the CA certificate in your browser to capture HTTPS traffic
        </p>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)]">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        >
          {showSettings ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Passthrough Domains
        </button>
        {showSettings && (
          <div className="px-3 pb-3">
            <input
              type="text"
              value={passthrough}
              onChange={(e) => setPassthrough(e.target.value)}
              placeholder="e.g. github.com, google.com"
              className="w-full rounded bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-indigo-500"
              onBlur={handleUpdatePassthrough}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdatePassthrough();
              }}
            />
            <p className="mt-1 text-[10px] text-[var(--color-text-dimmed)]">
              Comma-separated domains to skip capture
            </p>
          </div>
        )}
      </div>

      {/* Captures count */}
      <div className="text-center text-xs text-[var(--color-text-dimmed)]">
        {status.captureCount} request{status.captureCount !== 1 ? "s" : ""} captured
      </div>
    </div>
  );
}

export function ProxyCaptureViewer() {
  const { captures, selectedId, filter, setCaptures, clearCaptures, selectCapture, setFilter, addCapture, status } = useProxyStore();

  // Listen for live captures
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<CapturedRequest>("proxy:capture", (event) => {
          if (!cancelled) addCapture(event.payload);
        });
      } catch {
        // Not in Tauri env
      }
    };
    setup();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [addCapture]);

  // Load existing captures on mount
  useEffect(() => {
    proxyGetCaptures().then(setCaptures).catch(() => {});
  }, [setCaptures]);

  const handleClear = async () => {
    try {
      await proxyClearCaptures();
      clearCaptures();
    } catch {
      // ignore
    }
  };

  const selected = captures.find((c) => c.id === selectedId) ?? null;

  const filtered = filter
    ? captures.filter(
        (c) =>
          c.url.toLowerCase().includes(filter.toLowerCase()) ||
          c.method.toLowerCase().includes(filter.toLowerCase()) ||
          String(c.status ?? "").includes(filter),
      )
    : captures;

  return (
    <div className="flex flex-1 flex-col overflow-hidden border-l border-[var(--color-border)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
          CAPTURES
        </span>
        <span className="rounded-full bg-[var(--color-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-dimmed)]">
          {filtered.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-elevated)] px-2 py-0.5">
          <Search className="h-3 w-3 text-[var(--color-text-dimmed)]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="w-28 bg-transparent text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
          />
        </div>
        <button
          onClick={handleClear}
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
          title="Clear captures"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Capture list */}
        <div className="w-1/2 overflow-auto border-r border-[var(--color-border)]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-[var(--color-text-dimmed)]">
              {status.running
                ? "Waiting for requests..."
                : "Start the proxy to capture requests"}
            </div>
          ) : (
            filtered.map((cap) => (
              <button
                key={cap.id}
                onClick={() => selectCapture(cap.id)}
                className={`flex w-full items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 text-left transition-colors ${
                  selectedId === cap.id
                    ? "bg-[var(--color-accent-glow)]"
                    : "hover:bg-[var(--color-elevated)]"
                }`}
              >
                <MethodBadge method={cap.method} />
                <StatusBadge status={cap.status} />
                <span className="flex-1 truncate text-xs text-[var(--color-text-primary)]">
                  {shortenUrl(cap.url)}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--color-text-dimmed)]">
                  {cap.timeMs}ms
                </span>
              </button>
            ))
          )}
        </div>

        {/* Detail view */}
        <div className="flex-1 overflow-auto">
          {selected ? (
            <CaptureDetail capture={selected} />
          ) : (
            <div className="flex items-center justify-center py-8 text-xs text-[var(--color-text-dimmed)]">
              Select a request to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CaptureDetail({ capture }: { capture: CapturedRequest }) {
  const [activeTab, setActiveTab] = useState<"request" | "response">("response");

  const tabs = [
    { id: "request" as const, label: "Request" },
    { id: "response" as const, label: "Response" },
  ];

  return (
    <div className="flex flex-col">
      {/* URL */}
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <MethodBadge method={capture.method} />
          <StatusBadge status={capture.status} />
          <span className="text-[10px] text-[var(--color-text-dimmed)]">
            {capture.timeMs}ms
          </span>
        </div>
        <p className="mt-1 break-all text-xs text-[var(--color-text-primary)]">
          {capture.url}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-dimmed)]">
          {new Date(capture.timestamp).toLocaleString()}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-auto p-3">
        {activeTab === "request" ? (
          <>
            <SectionTitle>Headers</SectionTitle>
            <HeadersTable headers={capture.requestHeaders} />
            {capture.requestBody && (
              <>
                <SectionTitle>Body</SectionTitle>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-[var(--color-surface)] p-2 font-mono text-xs text-[var(--color-text-primary)]">
                  {tryFormatJson(capture.requestBody)}
                </pre>
              </>
            )}
          </>
        ) : (
          <>
            <SectionTitle>Headers</SectionTitle>
            <HeadersTable headers={capture.responseHeaders} />
            {capture.responseBody && (
              <>
                <SectionTitle>Body</SectionTitle>
                <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-surface)] p-2 font-mono text-xs text-[var(--color-text-primary)]">
                  {tryFormatJson(capture.responseBody)}
                </pre>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1 mt-3 first:mt-0 text-[10px] font-semibold uppercase text-[var(--color-text-dimmed)]">
      {children}
    </h4>
  );
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return <p className="text-xs text-[var(--color-text-dimmed)]">No headers</p>;
  }
  return (
    <div className="rounded border border-[var(--color-border)]">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex border-b border-[var(--color-border)] last:border-b-0"
        >
          <span className="w-1/3 shrink-0 break-all px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)]">
            {key}
          </span>
          <span className="flex-1 break-all px-2 py-1 text-[10px] text-[var(--color-text-primary)]">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/15 text-green-400",
    POST: "bg-blue-500/15 text-blue-400",
    PUT: "bg-amber-500/15 text-amber-400",
    PATCH: "bg-orange-500/15 text-orange-400",
    DELETE: "bg-red-500/15 text-red-400",
    HEAD: "bg-gray-500/15 text-gray-400",
    OPTIONS: "bg-purple-500/15 text-purple-400",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${colors[method] ?? "bg-gray-500/15 text-gray-400"}`}
    >
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-400">
        ERR
      </span>
    );
  }
  const color =
    status < 300
      ? "bg-green-500/15 text-green-400"
      : status < 400
        ? "bg-yellow-500/15 text-yellow-400"
        : "bg-red-500/15 text-red-400";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${color}`}>
      {status}
    </span>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
