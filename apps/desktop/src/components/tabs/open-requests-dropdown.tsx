import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { List, X } from "lucide-react";
import type { Tab } from "@apiark/types";
import { useTabStore } from "@/stores/tab-store";
import { TabBadge } from "./tab-badge";

function OpenRequestRow({
  tab,
  isActive,
  isHighlighted,
  onActivate,
  onClose,
}: {
  tab: Tab;
  isActive: boolean;
  isHighlighted: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={rowRef}
      onClick={onActivate}
      title={tab.name}
      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        isActive || isHighlighted
          ? "bg-[var(--color-accent-glow)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-glow)]/50"
      }`}
    >
      <TabBadge tab={tab} />
      <span className="min-w-0 flex-1 truncate">{tab.name}</span>
      {tab.isDirty && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-border)] group-hover:opacity-100"
        aria-label={`${t("tabs.close")} ${tab.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function OpenRequestsDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabStore();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setHighlightIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return tabs;
    return tabs.filter((tab) =>
      tab.name.toLowerCase().includes(query) ||
      tab.method.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query),
    );
  }, [tabs, query]);

  const pinned = filtered.filter((t) => t.pinned);
  const unpinned = filtered.filter((t) => !t.pinned);
  const ordered = [...pinned, ...unpinned];

  // Clamp highlight when the underlying list shrinks (e.g. closing a tab or filtering).
  useEffect(() => {
    if (highlightIndex >= ordered.length) {
      setHighlightIndex(Math.max(0, ordered.length - 1));
    }
  }, [ordered.length, highlightIndex]);

  const activate = (id: string) => {
    setActiveTab(id);
    setOpen(false);
  };

  const handlePopoverKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (ordered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, ordered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = ordered[highlightIndex];
      if (target) activate(target.id);
    }
  };

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        title={t("tabs.openRequests")}
        aria-label={t("tabs.openRequests")}
        aria-expanded={open}
      >
        <List className="h-4 w-4" />
        <span className="rounded-md bg-[var(--color-surface)] px-1.5 text-[10px] tabular-nums">
          {tabs.length}
        </span>
      </button>
      {open && (
        <div
          onKeyDown={handlePopoverKeyDown}
          className="absolute right-0 top-full z-50 mt-2 flex w-80 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-xl"
        >
          <div className="border-b border-[var(--color-border)] p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightIndex(0);
              }}
              placeholder={t("tabs.searchOpenRequests")}
              aria-label={t("tabs.searchOpenRequests")}
              className="w-full rounded-md bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
                {t("tabs.noMatchingRequests")}
              </div>
            ) : (
              <>
                {pinned.map((tab, i) => (
                  <OpenRequestRow
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    isHighlighted={i === highlightIndex}
                    onActivate={() => activate(tab.id)}
                    onClose={() => closeTab(tab.id)}
                  />
                ))}
                {pinned.length > 0 && unpinned.length > 0 && (
                  <div className="my-1 border-t border-[var(--color-border)]" />
                )}
                {unpinned.map((tab, i) => {
                  const overallIndex = pinned.length + i;
                  return (
                    <OpenRequestRow
                      key={tab.id}
                      tab={tab}
                      isActive={tab.id === activeTabId}
                      isHighlighted={overallIndex === highlightIndex}
                      onActivate={() => activate(tab.id)}
                      onClose={() => closeTab(tab.id)}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
