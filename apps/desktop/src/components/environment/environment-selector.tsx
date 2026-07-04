import { useEffect, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useCollectionStore } from "@/stores/collection-store";

export const EnvironmentSelector = forwardRef<HTMLButtonElement>(
  function EnvironmentSelector(_props, ref) {
    const { t } = useTranslation();
    const { environments, activeEnvironmentName, setActiveEnvironment, loadEnvironments } =
      useEnvironmentStore();
    const { collections } = useCollectionStore();

    useEffect(() => {
      if (collections.length > 0) {
        const firstCollection = collections[0];
        if (firstCollection.type === "collection") {
          loadEnvironments(firstCollection.path);
        }
      }
    }, [collections, loadEnvironments]);

    if (environments.length === 0) {
      return (
        <p className="text-xs text-[var(--color-text-dimmed)]">
          {t("environment.noEnvironments")}
        </p>
      );
    }

    const activeEnv = environments.find((e) => e.name === activeEnvironmentName);

    return (
      <Select.Root
        value={activeEnvironmentName ?? "__none__"}
        onValueChange={(v) => setActiveEnvironment(v === "__none__" ? null : v)}
      >
        <Select.Trigger
          ref={ref}
          data-tour="environment"
          className="flex w-full cursor-pointer items-center gap-1.5 rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-blue-500"
        >
          {activeEnv?.color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: activeEnv.color }}
            />
          )}
          <span className="truncate">
            <Select.Value placeholder={t("environment.noEnvironment")} />
          </span>
          <Select.Icon className="ml-auto shrink-0 text-[var(--color-text-dimmed)]">
            <ChevronDown className="h-3 w-3" />
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
  },
);

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
      className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none data-[highlighted]:bg-[var(--color-accent)]/10 data-[highlighted]:text-[var(--color-accent)] data-[state=checked]:bg-[var(--color-accent)]/10"
    >
      <Select.ItemText className="flex items-center gap-1.5">
        {children}
      </Select.ItemText>
    </Select.Item>
  );
}
