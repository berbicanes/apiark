import { useEffect, useRef } from "react";
import { useAuditStore } from "@/stores/audit-store";
import {
  Trash2,
  Send,
  FolderOpen,
  Globe,
  Save,
  XCircle,
  Settings,
  ClipboardList,
} from "lucide-react";

const ACTION_CONFIG: Record<string, { icon: typeof Send; color: string; label: string }> = {
  request_sent: { icon: Send, color: "text-blue-400", label: "Request Sent" },
  collection_opened: { icon: FolderOpen, color: "text-amber-400", label: "Collection Opened" },
  environment_changed: { icon: Globe, color: "text-emerald-400", label: "Environment Changed" },
  request_saved: { icon: Save, color: "text-green-400", label: "Request Saved" },
  request_deleted: { icon: XCircle, color: "text-red-400", label: "Request Deleted" },
  settings_changed: { icon: Settings, color: "text-violet-400", label: "Settings Changed" },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

export function AuditPanel() {
  const { entries, loading, hasMore, loadLogs, loadMore, clearLogs } = useAuditStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      loadMore();
    }
  };

  return (
    <div className="flex h-full flex-col px-2">
      {/* Header actions */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-dimmed)]">
          {entries.length} event{entries.length !== 1 ? "s" : ""}
        </span>
        {entries.length > 0 && (
          <button
            onClick={clearLogs}
            className="rounded p-1 text-[var(--color-text-dimmed)] hover:bg-[var(--color-border)] hover:text-red-400"
            title="Clear audit logs"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Entries list */}
      {loading && entries.length === 0 ? (
        <div className="space-y-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5">
              <div className="h-4 w-4 animate-pulse rounded bg-[var(--color-elevated)]" />
              <div className="h-3 flex-1 animate-pulse rounded bg-[var(--color-elevated)]" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-dimmed)]">
          <ClipboardList className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-xs">No audit events yet</p>
          <p className="mt-1 text-[10px] opacity-60">
            Actions will be logged as you use the app
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {entries.map((entry) => {
            const config = ACTION_CONFIG[entry.action] ?? {
              icon: ClipboardList,
              color: "text-[var(--color-text-muted)]",
              label: entry.action,
            };
            const Icon = config.icon;

            return (
              <div
                key={entry.id}
                className="group flex items-start gap-2 rounded px-2 py-1.5 hover:bg-[var(--color-elevated)]"
                title={formatTimestamp(entry.timestamp)}
              >
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.color}`} strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`text-[11px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--color-text-dimmed)]">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[var(--color-text-secondary)]">
                    {entry.target}
                  </p>
                  {entry.detail && (
                    <p className="truncate text-[10px] text-[var(--color-text-dimmed)]">
                      {entry.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="py-2 text-center text-[10px] text-[var(--color-text-dimmed)]">
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
