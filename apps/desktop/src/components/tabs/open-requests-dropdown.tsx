import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { List } from "lucide-react";
import type { Tab } from "@apiark/types";
import { useTabStore } from "@/stores/tab-store";
import { TabBadge } from "./tab-badge";

function OpenRequestRow({
  tab,
  isActive,
  onActivate,
}: {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <div
      onClick={onActivate}
      title={tab.name}
      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        isActive
          ? "bg-[var(--color-accent-glow)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-glow)]/50"
      }`}
    >
      <TabBadge tab={tab} />
      <span className="min-w-0 flex-1 truncate">{tab.name}</span>
      {tab.isDirty && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
      )}
    </div>
  );
}

export function OpenRequestsDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { tabs, activeTabId, setActiveTab } = useTabStore();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const pinned = tabs.filter((t) => t.pinned);
  const unpinned = tabs.filter((t) => !t.pinned);

  const activate = (id: string) => {
    setActiveTab(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        title={t("tabs.openRequests")}
        aria-label={t("tabs.openRequests")}
      >
        <List className="h-4 w-4" />
        <span className="rounded-md bg-[var(--color-surface)] px-1.5 text-[10px] tabular-nums">
          {tabs.length}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-80 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-xl">
          <div className="max-h-[60vh] overflow-y-auto p-1">
            {pinned.map((tab) => (
              <OpenRequestRow
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onActivate={() => activate(tab.id)}
              />
            ))}
            {pinned.length > 0 && unpinned.length > 0 && (
              <div className="my-1 border-t border-[var(--color-border)]" />
            )}
            {unpinned.map((tab) => (
              <OpenRequestRow
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onActivate={() => activate(tab.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
