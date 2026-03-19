import { forwardRef, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { HttpMethod, EnvironmentData } from "@apiark/types";
import { Loader2, Send, AlertCircle, Check, Download } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { saveEnvironment } from "@/lib/tauri-api";

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

/** Split a URL string into segments of plain text and {{variable}} references */
function splitUrlSegments(url: string): { type: "text" | "var"; value: string }[] {
  const segments: { type: "text" | "var"; value: string }[] = [];
  const regex = /\{\{([\w$]+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: url.slice(lastIndex, match.index) });
    }
    segments.push({ type: "var", value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < url.length) {
    segments.push({ type: "text", value: url.slice(lastIndex) });
  }
  return segments;
}

/** Inline popover for editing a single variable value */
function VariableEditor({
  varName,
  resolved,
  onSave,
  activeEnvName,
}: {
  varName: string;
  resolved: string | undefined;
  onSave: (name: string, value: string) => Promise<void>;
  activeEnvName: string | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(resolved ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when resolved value changes externally
  useEffect(() => {
    if (!open) setDraft(resolved ?? "");
  }, [resolved, open]);

  // Auto-focus input when popover opens
  useEffect(() => {
    if (open) {
      // Small delay so Radix finishes mounting
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSave = async () => {
    if (draft === (resolved ?? "") && resolved !== undefined) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(varName, draft);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const isUnresolved = resolved === undefined;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline rounded px-0.5 font-mono transition-colors ${
            isUnresolved
              ? "text-[var(--color-warning)] bg-[var(--color-warning)]/10 hover:bg-[var(--color-warning)]/20"
              : "text-[var(--color-accent)] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20"
          }`}
          title={
            isUnresolved
              ? `Click to set value for ${varName}`
              : `${varName} = ${resolved} — click to edit`
          }
        >
          {`{{${varName}}}`}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 shadow-xl"
          sideOffset={8}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
            <span className="font-mono text-[var(--color-accent)]">{`{{${varName}}}`}</span>
          </p>
          {!activeEnvName ? (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--color-warning)]/10 px-2.5 py-2 text-xs text-[var(--color-text-secondary)]">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-warning)]" />
              <span>Select an environment from the header dropdown first.</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                placeholder={`e.g. https://api.example.com`}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                  if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                disabled={saving}
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none transition-colors focus:border-[var(--color-accent)]/50 disabled:opacity-50"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 rounded-md bg-[var(--color-accent)] p-1.5 text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                title={t("common.save")}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
          {activeEnvName && (
            <p className="mt-2 text-[10px] text-[var(--color-text-dimmed)]">
              Saves to <span className="font-mono">{activeEnvName}</span> environment. Press Enter to save.
            </p>
          )}
          <Popover.Arrow className="fill-[var(--color-border)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export const UrlBar = forwardRef<HTMLInputElement>(function UrlBar(_props, ref) {
  const { t } = useTranslation();
  const tab = useActiveTab();
  const { setMethod, setUrl, send, sendAndDownload } = useTabStore();
  const [resolvedVars, setResolvedVars] = useState<Record<string, string>>({});
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge forwarded ref with local ref
  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [ref],
  );

  const variableRefs = useMemo(
    () => (tab ? extractVariableRefs(tab) : []),
    [tab?.url, tab?.headers, tab?.params, tab?.body.content],
  );

  const activeEnvName = useEnvironmentStore((s) => s.activeEnvironmentName);

  // Resolve variables eagerly
  useEffect(() => {
    if (variableRefs.length === 0) {
      setResolvedVars({});
      return;
    }
    useEnvironmentStore
      .getState()
      .getResolvedVariables()
      .then(setResolvedVars)
      .catch(() => setResolvedVars({}));
  }, [variableRefs, activeEnvName]);

  // URL segments for the overlay
  const urlSegments = useMemo(() => (tab ? splitUrlSegments(tab.url) : []), [tab?.url]);
  const hasVariablesInUrl = urlSegments.some((s) => s.type === "var");

  const handleSaveVariable = useCallback(async (varName: string, value: string) => {
    const { activeCollectionPath, activeEnvironmentName, environments } = useEnvironmentStore.getState();
    if (!activeCollectionPath || !activeEnvironmentName) return;

    const env = environments.find((e) => e.name === activeEnvironmentName);
    if (!env) return;

    const updatedEnv: EnvironmentData = {
      ...env,
      variables: { ...env.variables, [varName]: value },
    };
    await saveEnvironment(activeCollectionPath, updatedEnv);
    await useEnvironmentStore.getState().loadEnvironments(activeCollectionPath);
    const resolved = await useEnvironmentStore.getState().getResolvedVariables();
    setResolvedVars(resolved);
  }, []);

  const sendBtnRef = useRef<HTMLButtonElement>(null);

  const flashSendButton = useCallback((success: boolean) => {
    const btn = sendBtnRef.current;
    if (!btn) return;
    const cls = success ? "animate-flash-green" : "animate-flash-red";
    btn.classList.add(cls);
    const onEnd = () => { btn.classList.remove(cls); btn.removeEventListener("animationend", onEnd); };
    btn.addEventListener("animationend", onEnd);
  }, []);

  // Watch for response/error changes to flash the send button
  useEffect(() => {
    if (!tab || tab.loading) return;
    if (tab.response) flashSendButton(tab.response.status < 400);
    else if (tab.error) flashSendButton(false);
  }, [tab?.response, tab?.error, tab?.loading, flashSendButton]);

  if (!tab) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      send();
    }
  };

  return (
    <div data-tour="url-bar" className="flex items-center gap-3 bg-[var(--color-card)] px-4 py-3">
      {/* Method selector — show static GQL badge for GraphQL tabs */}
      {tab.protocol === "graphql" ? (
        <span className="rounded-lg bg-violet-500/15 px-3 py-2 text-sm font-bold text-violet-400">
          GQL
        </span>
      ) : (
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
      )}

      {/* URL input with variable highlighting overlay */}
      <div className="relative flex-1">
        <input
          ref={setRefs}
          type="text"
          value={tab.url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={t("request.urlPlaceholder")}
          className={`w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-4 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]/50 focus:ring-2 focus:ring-[var(--color-accent)]/20 ${
            hasVariablesInUrl && !inputFocused
              ? "text-transparent caret-[var(--color-text-primary)]"
              : "text-[var(--color-text-primary)]"
          } placeholder-[var(--color-text-dimmed)]`}
        />
        {/* Colored overlay — visible when input is NOT focused and URL has variables */}
        {hasVariablesInUrl && !inputFocused && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center px-4 text-sm"
            aria-hidden="true"
          >
            <div className="flex items-center overflow-hidden whitespace-nowrap">
              {urlSegments.map((seg, i) =>
                seg.type === "text" ? (
                  <span key={i} className="text-[var(--color-text-primary)]">
                    {seg.value}
                  </span>
                ) : (
                  <span key={i} className="pointer-events-auto">
                    <VariableEditor
                      varName={seg.value}
                      resolved={resolvedVars[seg.value]}
                      onSave={handleSaveVariable}
                      activeEnvName={activeEnvName}
                    />
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="relative flex items-center gap-1">
        <div className="flex rounded-lg bg-[var(--color-accent)] transition-all hover:bg-[var(--color-accent-hover)]">
          <button
            ref={sendBtnRef}
            data-tour="send-btn"
            onClick={send}
            disabled={tab.loading || !tab.url.trim()}
            className="flex items-center gap-2 rounded-l-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {tab.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("request.send")}
          </button>
          
          <div className="w-[1px] bg-white/20 my-1" />
          
          <button
            onClick={sendAndDownload}
            disabled={tab.loading || !tab.url.trim()}
            className="flex items-center justify-center rounded-r-lg px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            title={t("request.sendAndDownload") || "Send and Download"}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
        <HintTooltip hintId="send-shortcut" message="Tip: Press Ctrl+Enter to send requests quickly" />
      </div>
    </div>
  );
});
