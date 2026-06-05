import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMonitorStore } from "@/stores/monitor-store";
import { useCollectionStore } from "@/stores/collection-store";
import {
  createMonitor,
  deleteMonitor,
  toggleMonitor,
  listMonitors,
  getMonitorResults,
} from "@/lib/tauri-api";
import { listen } from "@tauri-apps/api/event";
import type { MonitorResult } from "@apiark/types";
import { Plus, Trash2, Play, Pause, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

const CRON_PRESETS = [
  { label: "Every minute", value: "0 * * * * *" },
  { label: "Every 5 minutes", value: "0 */5 * * * *" },
  { label: "Every 15 minutes", value: "0 */15 * * * *" },
  { label: "Every hour", value: "0 0 * * * *" },
  { label: "Every 6 hours", value: "0 0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 0 * * *" },
];

export function MonitorDialog() {
  const { t } = useTranslation();
  const {
    monitors,
    results,
    dialogOpen,
    selectedMonitorId,
    closeDialog,
    setMonitors,
    addMonitor,
    removeMonitor,
    updateMonitor,
    selectMonitor,
    setResults,
    addResult,
  } = useMonitorStore();
  const collections = useCollectionStore((s) => s.collections);

  const [name, setName] = useState("");
  const [collectionPath, setCollectionPath] = useState("");
  const [cronExpression, setCronExpression] = useState("0 */5 * * * *");
  const [environmentName, setEnvironmentName] = useState("");
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load monitors on dialog open
  useEffect(() => {
    if (dialogOpen) {
      listMonitors().then(setMonitors).catch(() => {});
    }
  }, [dialogOpen, setMonitors]);

  // Default collection
  useEffect(() => {
    if (!collectionPath && collections.length > 0) {
      setCollectionPath(collections[0].path);
    }
  }, [collections, collectionPath]);

  // Listen for monitor result events
  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    for (const monitor of monitors) {
      listen<MonitorResult>(`monitor:result:${monitor.id}`, (event) => {
        addResult(monitor.id, event.payload);
        // Refresh monitor list to get updated status
        listMonitors().then(setMonitors).catch(() => {});
      }).then((unlisten) => unlisteners.push(unlisten));
    }

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [monitors, addResult, setMonitors]);

  // Load results when selecting a monitor
  useEffect(() => {
    if (selectedMonitorId) {
      getMonitorResults(selectedMonitorId).then((r) => setResults(selectedMonitorId, r)).catch(() => {});
    }
  }, [selectedMonitorId, setResults]);

  const handleCreate = async () => {
    if (!name || !collectionPath) return;
    setCreating(true);
    setError(null);
    try {
      const status = await createMonitor({
        name,
        collectionPath,
        cronExpression,
        environmentName: environmentName || undefined,
        notifyOnFailure,
        webhookUrl: webhookUrl || undefined,
      });
      addMonitor(status);
      selectMonitor(status.id);
      setName("");
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMonitor(id);
      removeMonitor(id);
      if (selectedMonitorId === id) selectMonitor(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleMonitor(id);
      updateMonitor(updated);
    } catch (err) {
      setError(String(err));
    }
  };

  if (!dialogOpen) return null;

  const selectedResults = selectedMonitorId ? (results[selectedMonitorId] ?? []) : [];
  const selectedMonitor = monitors.find((m) => m.id === selectedMonitorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-[900px] flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <Clock className="h-4 w-4" /> {t("monitor.title")}
          </h2>
          <button onClick={closeDialog} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: create + list */}
          <div className="flex w-[340px] flex-col border-r border-[var(--color-border)]">
            {/* Create form */}
            <div className="space-y-2 border-b border-[var(--color-border)] p-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("monitor.create")}
                className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
              />
              <select
                value={collectionPath}
                onChange={(e) => setCollectionPath(e.target.value)}
                className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {collections.map((c) => (
                  <option key={c.path} value={c.path}>{c.name}</option>
                ))}
              </select>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)]">Schedule</label>
                <select
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <Input
                value={environmentName}
                onChange={(e) => setEnvironmentName(e.target.value)}
                placeholder="Environment (optional)"
                className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
              />
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="Webhook URL (optional)"
                className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
              />
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={notifyOnFailure}
                  onChange={(e) => setNotifyOnFailure(e.target.checked)}
                />
                Notify on failure
              </label>
              <button
                onClick={handleCreate}
                disabled={creating || !name || !collectionPath}
                className="flex w-full items-center justify-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                {creating ? "Creating..." : t("monitor.newMonitor")}
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            {/* Monitor list */}
            <div className="flex-1 overflow-auto">
              {monitors.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-dimmed)]">
                  No monitors configured
                </div>
              ) : (
                monitors.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => selectMonitor(m.id)}
                    className={`flex cursor-pointer items-center justify-between border-b border-[var(--color-border)] px-3 py-2 ${
                      selectedMonitorId === m.id ? "bg-[var(--color-elevated)]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            m.lastStatus === "pass"
                              ? "bg-green-500"
                              : m.lastStatus === "fail"
                                ? "bg-red-500"
                                : "bg-gray-500"
                          }`}
                        />
                        <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                          {m.name}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {m.runCount} runs · {m.enabled ? "Active" : "Paused"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(m.id); }}
                        className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]"
                        title={m.enabled ? t("monitor.enabled") : t("monitor.disabled")}
                      >
                        {m.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                        className="rounded p-1 text-red-400 hover:bg-red-400/10"
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: results */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {selectedMonitor ? (
              <>
                <div className="border-b border-[var(--color-border)] px-3 py-2">
                  <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
                    {selectedMonitor.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {selectedMonitor.cronExpression} · {selectedMonitor.enabled ? "Active" : "Paused"}
                    {selectedMonitor.lastRun && ` · Last: ${new Date(selectedMonitor.lastRun).toLocaleString()}`}
                  </p>
                </div>

                {/* Results history */}
                <div className="flex-1 overflow-auto">
                  {selectedResults.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-dimmed)]">
                      No results yet — waiting for first run
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--color-surface)]">
                        <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                          <th className="px-3 py-1.5">Time</th>
                          <th className="px-3 py-1.5">Status</th>
                          <th className="px-3 py-1.5">Requests</th>
                          <th className="px-3 py-1.5">Passed</th>
                          <th className="px-3 py-1.5">Failed</th>
                          <th className="px-3 py-1.5">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedResults.map((r) => (
                          <tr key={r.id} className="border-b border-[var(--color-border)]">
                            <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">
                              {new Date(r.timestamp).toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                  r.status === "pass"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {r.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-[var(--color-text-primary)]">{r.totalRequests}</td>
                            <td className="px-3 py-1.5 text-green-400">{r.totalPassed}</td>
                            <td className="px-3 py-1.5 text-red-400">{r.totalFailed}</td>
                            <td className="px-3 py-1.5 text-[var(--color-text-muted)]">{r.totalTimeMs}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-text-dimmed)]">
                Select a monitor to view results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
