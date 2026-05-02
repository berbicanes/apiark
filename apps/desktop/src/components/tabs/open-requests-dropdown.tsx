import { useTranslation } from "react-i18next";
import { List } from "lucide-react";
import { useTabStore } from "@/stores/tab-store";

export function OpenRequestsDropdown() {
  const { t } = useTranslation();
  const tabs = useTabStore((s) => s.tabs);

  return (
    <div className="relative flex items-center">
      <button
        className="ml-1 flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        title={t("tabs.openRequests")}
        aria-label={t("tabs.openRequests")}
      >
        <List className="h-4 w-4" />
        <span className="rounded-md bg-[var(--color-surface)] px-1.5 text-[10px] tabular-nums">
          {tabs.length}
        </span>
      </button>
    </div>
  );
}
