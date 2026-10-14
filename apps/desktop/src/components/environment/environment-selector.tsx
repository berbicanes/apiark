import { useEffect, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useCollectionStore } from "@/stores/collection-store";
import { useTabStore } from "@/stores/tab-store";

interface EnvironmentSelectorProps {
  compact?: boolean;
}

export const EnvironmentSelector = forwardRef<HTMLSelectElement, EnvironmentSelectorProps>(
  function EnvironmentSelector({ compact = false }, ref) {
    const { t } = useTranslation();
    const {
      environments,
      activeEnvironmentName,
      activeCollectionPath,
      setActiveEnvironment,
      loadEnvironments,
      clear,
    } = useEnvironmentStore();
    const { collections } = useCollectionStore();
    const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

    const targetPath =
      activeTab?.collectionPath ??
      activeCollectionPath ??
      collections.find((c) => c.type === "collection")?.path ??
      null;

    useEffect(() => {
      if (collections.length === 0) {
        clear();
      } else if (targetPath && targetPath !== activeCollectionPath) {
        loadEnvironments(targetPath);
      }
    }, [collections.length, targetPath, activeCollectionPath, loadEnvironments, clear]);

    if (environments.length === 0) {
      if (compact) {
        return (
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-2.5 py-1.5 text-xs text-[var(--color-text-dimmed)] opacity-70">
            <Globe className="h-3.5 w-3.5 opacity-50" />
            <span>{t("environment.noEnvironment")}</span>
          </div>
        );
      }
      return (
        <p className="text-xs text-[var(--color-text-dimmed)]">
          {t("environment.noEnvironments")}
        </p>
      );
    }

    if (compact) {
      return (
        <div className="relative inline-flex items-center">
          <Globe className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-emerald-400" />
          <select
            ref={ref}
            data-tour="environment-urlbar"
            value={activeEnvironmentName ?? ""}
            onChange={(e) => setActiveEnvironment(e.target.value || null)}
            className="h-9 cursor-pointer appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] pl-8 pr-7 text-xs font-medium text-[var(--color-text-primary)] outline-none transition-all hover:border-[var(--color-border-hover)] focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="" className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]">
              {t("environment.noEnvironment")}
            </option>
            {environments.map((env) => (
              <option
                key={env.name}
                value={env.name}
                className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]"
              >
                {env.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 text-[10px] text-[var(--color-text-dimmed)]">
            ▼
          </div>
        </div>
      );
    }

    return (
      <select
        ref={ref}
        data-tour="environment"
        value={activeEnvironmentName ?? ""}
        onChange={(e) =>
          setActiveEnvironment(e.target.value || null)
        }
        className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="" className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]">
          {t("environment.noEnvironment")}
        </option>
        {environments.map((env) => (
          <option
            key={env.name}
            value={env.name}
            className="bg-[var(--color-elevated)] text-[var(--color-text-primary)]"
          >
            {env.name}
          </option>
        ))}
      </select>
    );
  },
);
