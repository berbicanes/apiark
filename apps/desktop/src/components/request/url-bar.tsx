import { forwardRef, useState, useEffect, useMemo } from "react";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { HttpMethod } from "@apiark/types";
import { Loader2, Send, Eye } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { HintTooltip } from "@/components/ui/hint-tooltip";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-400",
  POST: "text-amber-400",
  PUT: "text-blue-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
  HEAD: "text-cyan-400",
  OPTIONS: "text-gray-400",
};

const METHOD_BG: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/10",
  POST: "bg-amber-500/10",
  PUT: "bg-blue-500/10",
  PATCH: "bg-purple-500/10",
  DELETE: "bg-red-500/10",
  HEAD: "bg-cyan-500/10",
  OPTIONS: "bg-gray-500/10",
};

/** Extract all {{variableName}} references from a tab's fields */
function extractVariableRefs(tab: {
  url: string;
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
  body: { content: string };
}): string[] {
  const text = [
    tab.url,
    ...tab.headers.flatMap((h) => [h.key, h.value]),
    ...tab.params.flatMap((p) => [p.key, p.value]),
    tab.body.content,
  ].join(" ");

  const matches = text.match(/\{\{([\w$]+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

export const UrlBar = forwardRef<HTMLInputElement>(function UrlBar(_props, ref) {
  const tab = useActiveTab();
  const { setMethod, setUrl, send } = useTabStore();
  const [resolvedVars, setResolvedVars] = useState<Record<string, string>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);

  const variableRefs = useMemo(
    () => (tab ? extractVariableRefs(tab) : []),
    [tab?.url, tab?.headers, tab?.params, tab?.body.content],
  );

  // Resolve variables when popover opens
  useEffect(() => {
    if (!popoverOpen || variableRefs.length === 0) return;
    useEnvironmentStore
      .getState()
      .getResolvedVariables()
      .then(setResolvedVars)
      .catch(() => setResolvedVars({}));
  }, [popoverOpen, variableRefs]);

  if (!tab) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      send();
    }
  };

  return (
    <div data-tour="url-bar" className="flex items-center gap-3 bg-[var(--color-card)] px-4 py-3">
      {/* Method selector */}
      <select
        value={tab.method}
        onChange={(e) => setMethod(e.target.value as HttpMethod)}
        className={`${METHOD_COLORS[tab.method]} ${METHOD_BG[tab.method]} cursor-pointer rounded-lg px-3 py-2 text-sm font-bold outline-none transition-colors focus:ring-2 focus:ring-[var(--color-accent)]/50`}
      >
        {METHODS.map((m) => (
          <option key={m} value={m} className="text-[var(--color-text-primary)] bg-[var(--color-elevated)]">
            {m}
          </option>
        ))}
      </select>

      {/* URL input */}
      <div className="relative flex-1">
        <input
          ref={ref}
          type="text"
          value={tab.url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter request URL..."
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-4 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none transition-all focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </div>

      {/* Variable quick-view */}
      {variableRefs.length > 0 && (
        <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Popover.Trigger asChild>
            <button
              className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-accent)]"
              title="View resolved variables"
            >
              <Eye className="h-4 w-4" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 shadow-xl"
              sideOffset={5}
              align="end"
            >
              <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                Variables in this request
              </p>
              <div className="space-y-1.5">
                {variableRefs.map((name) => {
                  const resolved = resolvedVars[name];
                  return (
                    <div key={name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[var(--color-accent)]">{`{{${name}}}`}</span>
                      {resolved !== undefined ? (
                        <span className="truncate text-[var(--color-text-primary)]">{resolved}</span>
                      ) : (
                        <span className="italic text-[var(--color-error)]">unresolved</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <Popover.Arrow className="fill-[var(--color-border)]" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {/* Send button */}
      <div className="relative">
        <button
          data-tour="send-btn"
          onClick={send}
          disabled={tab.loading || !tab.url.trim()}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          {tab.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </button>
        <HintTooltip hintId="send-shortcut" message="Tip: Press Ctrl+Enter to send requests quickly" />
      </div>
    </div>
  );
});
