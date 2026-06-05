import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironmentStore } from "@/stores/environment-store";

export const EnvironmentSelector = forwardRef<HTMLSelectElement>(
  function EnvironmentSelector(_props, ref) {
    const { t } = useTranslation();
    const { environments, activeEnvironmentName, setActiveEnvironment } =
      useEnvironmentStore();

    // Environments are loaded once by useActiveCollectionEnvironments (mounted
    // at the App level), so this selector only reads/switches the active one.

    if (environments.length === 0) {
      return (
        <p className="text-xs text-[var(--color-text-dimmed)]">
          {t("environment.noEnvironments")}
        </p>
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
        <option value="">{t("environment.noEnvironment")}</option>
        {environments.map((env) => (
          <option key={env.name} value={env.name}>
            {env.name}
          </option>
        ))}
      </select>
    );
  },
);
