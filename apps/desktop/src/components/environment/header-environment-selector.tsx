import { useTranslation } from "react-i18next";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { useEnvironmentStore } from "@/stores/environment-store";

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

  const activeEnv = environments.find((e) => e.name === activeEnvironmentName);

  return (
    <Select.Root
      value={activeEnvironmentName ?? "__none__"}
      onValueChange={(v) => setActiveEnvironment(v === "__none__" ? null : v)}
    >
      <Select.Trigger
        aria-label={t("environment.title")}
        className="flex max-w-[180px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/20"
        style={
          activeEnv?.color
            ? {
                borderColor: activeEnv.color,
                backgroundColor: `${activeEnv.color}1A`,
              }
            : { backgroundColor: "var(--color-elevated)" }
        }
      >
        <span className="truncate">
          <Select.Value placeholder={t("environment.noEnvironment")} />
        </span>
        <Select.Icon className="ml-auto shrink-0 text-[var(--color-text-dimmed)]">
          <ChevronDown className="h-3.5 w-3.5" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[260px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-lg"
        >
          <Select.Viewport className="p-1">
            <SelectItem value="__none__">
              <span className="text-[var(--color-text-dimmed)]">
                {t("environment.noEnvironment")}
              </span>
            </SelectItem>
            {environments.map((env) => (
              <SelectItem key={env.name} value={env.name}>
                {env.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: env.color }}
                  />
                )}
                {env.name}
              </SelectItem>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function SelectItem({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  return (
    <Select.Item
      value={value}
      className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none data-[highlighted]:bg-[var(--color-accent)]/10 data-[highlighted]:text-[var(--color-accent)] data-[state=checked]:bg-[var(--color-accent)]/10"
    >
      <Select.ItemText className="flex items-center gap-1.5">
        {children}
      </Select.ItemText>
    </Select.Item>
  );
}
