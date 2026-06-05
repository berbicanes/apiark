import { useTranslation } from "react-i18next";
import { useEnvironmentStore } from "@/stores/environment-store";

/**
 * Compact environment switcher for the request toolbar (URL bar row).
 *
 * Mirrors the side-panel EnvironmentSelector but is styled for the header and
 * does not own the environment-loading effect — it only reads/switches the
 * active environment via the shared store, so both selectors stay in sync.
 */
export function HeaderEnvironmentSelector() {
  const { t } = useTranslation();
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentName = useEnvironmentStore((s) => s.activeEnvironmentName);
  const setActiveEnvironment = useEnvironmentStore((s) => s.setActiveEnvironment);

  if (environments.length === 0) {
    return (
      <span
        className="flex shrink-0 items-center rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-dimmed)]"
        title={t("environment.noEnvironments")}
      >
        {t("environment.noEnvironment")}
      </span>
    );
  }

  return (
    <select
      id="header-environment-selector"
      value={activeEnvironmentName ?? ""}
      onChange={(e) => setActiveEnvironment(e.target.value || null)}
      title={t("environment.title")}
      aria-label={t("environment.title")}
      className="max-w-[180px] shrink-0 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/20"
    >
      <option value="">{t("environment.noEnvironment")}</option>
      {environments.map((env) => (
        <option key={env.name} value={env.name}>
          {env.name}
        </option>
      ))}
    </select>
  );
}
