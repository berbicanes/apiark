import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMockStore } from "@/stores/mock-store";
import { useCollectionStore } from "@/stores/collection-store";
import { startMockServer, stopMockServer, listMockServers } from "@/lib/tauri-api";
import { listen } from "@tauri-apps/api/event";
import type { MockRequestLog } from "@apiark/types";
import { Play, Square, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MockServerDialog() {
  const { t } = useTranslation();
  const { servers, logs, dialogOpen, closeDialog, addServer, removeServer, addLog, clearLogs, setServers } =
    useMockStore();
  const collections = useCollectionStore((s) => s.collections);

  const [port, setPort] = useState(4000);
  const [latencyMs, setLatencyMs] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);

  // Load existing servers on mount
  useEffect(() => {
    if (dialogOpen) {
      listMockServers().then(setServers).catch(() => {});
    }
  }, [dialogOpen, setServers]);

  // Default collection selection
  useEffect(() => {
    if (!selectedCollection && collections.length > 0) {
      setSelectedCollection(collections[0].path);
    }
  }, [collections, selectedCollection]);

  // Listen for mock request events
  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    for (const server of servers) {
      listen<MockRequestLog>(`mock:request:${server.id}`, (event) => {
        addLog(server.id, event.payload);
      }).then((unlisten) => unlisteners.push(unlisten));
    }

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [servers, addLog]);

  const handleStart = async () => {
    if (!selectedCollection) return;
    setStarting(true);
    setError(null);
    try {
      const status = await startMockServer({
        collectionPath: selectedCollection,
        port,
        latencyMs,
        errorRate: errorRate / 100,
      });
      addServer(status);
      setActiveServerId(status.id);
    } catch (err) {
      setError(typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (serverId: string) => {
    try {
      await stopMockServer(serverId);
      removeServer(serverId);
      if (activeServerId === serverId) {
        setActiveServerId(servers.find((s) => s.id !== serverId)?.id ?? null);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  if (!dialogOpen) return null;

  const activeServer = servers.find((s) => s.id === activeServerId);
  const activeLogs = activeServerId ? (logs[activeServerId] ?? []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-[900px] flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("mock.title")}</h2>
          <button onClick={closeDialog} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: config + server list */}
          <div className="flex w-[340px] flex-col border-r border-[var(--color-border)]">
            {/* Start new server */}
            <div className="space-y-2 border-b border-[var(--color-border)] p-3">
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">{t("mock.collection")}</label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {collections.map((c) => (
                  <option key={c.path} value={c.path}>{c.name}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--color-text-muted)]">{t("mock.port")}</label>
                  <Input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--color-text-muted)]">{t("mock.latency")}</label>
                  <Input
                    type="number"
                    value={latencyMs}
                    onChange={(e) => setLatencyMs(Number(e.target.value))}
                    className="w-full rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--color-text-muted)]">Error %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={errorRate}
                    onChange={(e) => setErrorRate(Number(e.target.value))}
                    className="w-full rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={starting || !selectedCollection}
                className="flex w-full items-center justify-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                {starting ? t("mock.starting") : t("mock.start")}
              </button>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>

            {/* Server list */}
            <div className="flex-1 overflow-auto">
              {servers.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-dimmed)]">
                  {t("mock.noServers")}
                </div>
              ) : (
                servers.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => setActiveServerId(srv.id)}
                    className={`flex cursor-pointer items-center justify-between border-b border-[var(--color-border)] px-3 py-2 ${
                      activeServerId === srv.id ? "bg-[var(--color-elevated)]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">
                        :{srv.port} — {srv.collectionName}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {srv.endpoints.length} endpoint{srv.endpoints.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStop(srv.id); }}
                      className="rounded p-1 text-red-400 hover:bg-red-400/10"
                      title={t("mock.stopServer")}
                    >
                      <Square className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: endpoints + request log */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {activeServer ? (
              <>
                {/* Endpoints */}
                <div className="border-b border-[var(--color-border)] p-3">
                  <h3 className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">{t("mock.endpoints")}</h3>
                  <div className="max-h-[140px] overflow-auto">
                    {activeServer.endpoints.map((ep, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                        <span className={`w-14 font-mono font-bold ${methodColor(ep.method)}`}>
                          {ep.method}
                        </span>
                        <span className="font-mono text-[var(--color-text-primary)]">{ep.path}</span>
                        <span className="text-[var(--color-text-muted)]">→ {ep.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Request log */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">{t("mock.requestLog")}</h3>
                  <button
                    onClick={() => clearLogs(activeServer.id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    title={t("mock.clearLogs")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  {activeLogs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-dimmed)]">
                      Waiting for requests on localhost:{activeServer.port}...
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {[...activeLogs].reverse().map((log, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono">
                          <span className={`w-10 text-right ${statusColor(log.status)}`}>{log.status}</span>
                          <span className={`w-12 font-bold ${methodColor(log.method)}`}>{log.method}</span>
                          <span className="flex-1 truncate text-[var(--color-text-primary)]">{log.path}</span>
                          <span className="text-[var(--color-text-muted)]">{log.timeMs}ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-dimmed)]">
                {t("mock.selectServer")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return "text-green-400";
    case "POST": return "text-yellow-400";
    case "PUT": return "text-blue-400";
    case "PATCH": return "text-purple-400";
    case "DELETE": return "text-red-400";
    default: return "text-[var(--color-text-muted)]";
  }
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-green-400";
  if (status >= 300 && status < 400) return "text-yellow-400";
  if (status >= 400 && status < 500) return "text-red-400";
  if (status >= 500) return "text-red-500";
  return "text-[var(--color-text-muted)]";
}
