import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { HttpMethod } from "@apiark/types";
import { useHistoryStore } from "@/stores/history-store";
import { useTabStore } from "@/stores/tab-store";
import { Search, Trash2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HistorySkeleton } from "@/components/ui/skeleton";
import { EmptyState, ClockEmptyIcon } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

const METHOD_COLORS: Record<string, string> = {
  GET: "text-green-500",
  POST: "text-yellow-500",
  PUT: "text-blue-500",
  PATCH: "text-purple-500",
  DELETE: "text-red-500",
  HEAD: "text-cyan-500",
  OPTIONS: "text-gray-500",
};

function statusColor(status?: number): string {
  if (!status) return "text-[var(--color-text-muted)]";
  if (status < 300) return "text-green-500";
  if (status < 400) return "text-yellow-500";
  return "text-red-500";
}

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

const ROW_HEIGHT = 32;

export function HistoryPanel() {
  const { t } = useTranslation();
  const { entries, loading, loadHistory, searchHistory, clearHistory } =
    useHistoryStore();
  const [searchQuery, setSearchQuery] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchHistory(query);
    } else {
      loadHistory();
    }
  };

  const handleRestore = (entry: typeof entries[0]) => {
    const { setMethod, setUrl } = useTabStore.getState();
    useTabStore.getState().newTab();
    setTimeout(() => {
      setMethod(entry.method as HttpMethod);
      setUrl(entry.url);
    }, 0);
  };

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div className="px-2">
      {/* Search + clear */}
      <div className="mb-1 flex items-center gap-1">
        <div className="flex flex-1 items-center rounded bg-[var(--color-elevated)] px-2">
          <Search className="h-3 w-3 text-[var(--color-text-dimmed)]" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("history.search")}
            className="w-full bg-transparent px-1.5 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
          />
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded p-1 text-[var(--color-text-dimmed)] hover:bg-[var(--color-border)] hover:text-red-400"
            title={t("history.clear")}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Entries */}
      {loading ? (
        <HistorySkeleton />
      ) : entries.length === 0 ? (
        searchQuery ? (
          <p className="py-2 text-center text-xs text-[var(--color-text-dimmed)]">{t("history.noResults")}</p>
        ) : (
          <EmptyState
            icon={<ClockEmptyIcon size={32} />}
            title={t("history.noHistory")}
            description={t("history.noHistory")}
          />
        )
      ) : (
        <div
          ref={parentRef}
          className="max-h-[300px] overflow-y-auto"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = entries[virtualRow.index];
              return (
                <button
                  key={entry.id}
                  onClick={() => handleRestore(entry)}
                  className="flex w-full items-center gap-1.5 rounded px-2 text-left hover:bg-[var(--color-elevated)]"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <span
                    className={`w-9 shrink-0 text-[10px] font-bold ${METHOD_COLORS[entry.method] ?? "text-[var(--color-text-muted)]"}`}
                  >
                    {entry.method}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-secondary)]">
                    {entry.url}
                  </span>
                  <span className={`shrink-0 text-[10px] ${statusColor(entry.status ?? undefined)}`}>
                    {entry.status ?? "—"}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-dimmed)]">
                    {timeAgo(entry.timestamp)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
