import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { HttpMethod } from "@apiark/types";
import { useHistoryStore } from "@/stores/history-store";
import { useCollectionStore } from "@/stores/collection-store";
import { useTabStore } from "@/stores/tab-store";
import { Search, Trash2, Filter } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HistorySkeleton } from "@/components/ui/skeleton";
import { EmptyState, ClockEmptyIcon } from "@/components/ui/empty-state";

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
  const { collections } = useCollectionStore();
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const activeCollectionPath =
    activeTab?.collectionPath ?? collections.find((c) => c.type === "collection")?.path ?? null;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"current" | "all" | string>("current");
  const parentRef = useRef<HTMLDivElement>(null);

  const effectivePath = useMemo(() => {
    if (filterMode === "all") return null;
    if (filterMode === "current") return activeCollectionPath;
    return filterMode;
  }, [filterMode, activeCollectionPath]);

  useEffect(() => {
    loadHistory(effectivePath);
  }, [effectivePath, loadHistory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchHistory(query, effectivePath);
    } else {
      loadHistory(effectivePath);
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

  const activeCollectionName = useMemo(() => {
    if (!activeCollectionPath) return null;
    return collections.find((c) => c.path === activeCollectionPath)?.name ?? null;
  }, [collections, activeCollectionPath]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      {/* Top controls */}
      <div className="shrink-0 space-y-1.5 pb-2">
        {/* Collection filter */}
        {collections.length > 0 && (
          <div className="flex items-center gap-1.5 rounded bg-[var(--color-elevated)] px-2 py-1">
            <Filter className="h-3 w-3 shrink-0 text-[var(--color-text-dimmed)]" />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full cursor-pointer bg-transparent text-[11px] font-medium text-[var(--color-text-primary)] outline-none"
            >
              {activeCollectionPath && (
                <option value="current" className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]">
                  {activeCollectionName ? `Current: ${activeCollectionName}` : "Current Collection"}
                </option>
              )}
              <option value="all" className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]">
                All Collections
              </option>
              {collections.map((c) => (
                <option
                  key={c.path}
                  value={c.path}
                  className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]"
                >
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search + clear */}
        <div className="flex items-center gap-1">
          <div className="flex flex-1 items-center rounded bg-[var(--color-elevated)] px-2">
            <Search className="h-3 w-3 text-[var(--color-text-dimmed)]" />
            <input
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
      </div>

      {/* Entries */}
      <div className="flex-1 min-h-0">
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
            className="h-full overflow-y-auto"
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
              const collectionLabel = entry.collectionPath
                ? collections.find((c) => c.path === entry.collectionPath)?.name ??
                  entry.collectionPath.split(/[/\\]/).filter(Boolean).pop()
                : null;

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
                  {(filterMode === "all" || filterMode === "current") && collectionLabel && (
                    <span
                      className="max-w-[70px] shrink-0 truncate rounded bg-[var(--color-border)] px-1 py-0.5 text-[9px] font-medium text-[var(--color-text-dimmed)]"
                      title={entry.collectionPath}
                    >
                      {collectionLabel}
                    </span>
                  )}
                  <span
                    className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-secondary)]"
                    title={entry.url}
                  >
                    {entry.requestName ? `${entry.requestName} (${entry.url})` : entry.url}
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
    </div>
  );
}
