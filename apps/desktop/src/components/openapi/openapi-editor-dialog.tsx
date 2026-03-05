import { useState, useEffect, useCallback, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { CodeEditor } from "@/components/ui/code-editor";

interface LintResult {
  line: number;
  character: number;
  message: string;
  severity: "error" | "warning" | "info" | "hint";
  code: string;
}

interface OpenAPIEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function OpenAPIEditorDialog({
  open,
  onOpenChange,
  initialContent = "",
  onSave,
}: OpenAPIEditorDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [lintResults, setLintResults] = useState<LintResult[]>([]);
  const [linting, setLinting] = useState(false);
  const lintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open && initialContent) {
      setContent(initialContent);
    }
  }, [open, initialContent]);

  const runLint = useCallback(async (spec: string) => {
    if (!spec.trim()) {
      setLintResults([]);
      return;
    }
    setLinting(true);
    try {
      const { Spectral } = await import("@stoplight/spectral-core");
      const { oas } = await import("@stoplight/spectral-rulesets");

      const spectral = new Spectral();
      spectral.setRuleset(oas as never);
      const results = await spectral.run(spec);

      setLintResults(
        results.map((r) => ({
          line: (r.range?.start?.line ?? 0) + 1,
          character: (r.range?.start?.character ?? 0) + 1,
          message: r.message,
          severity: r.severity === 0 ? "error" : r.severity === 1 ? "warning" : r.severity === 2 ? "info" : "hint",
          code: String(r.code),
        }))
      );
    } catch {
      // Spectral may fail on invalid YAML/JSON — that's ok
      setLintResults([]);
    } finally {
      setLinting(false);
    }
  }, []);

  // Debounced lint on content change
  useEffect(() => {
    clearTimeout(lintTimer.current);
    lintTimer.current = setTimeout(() => runLint(content), 800);
    return () => clearTimeout(lintTimer.current);
  }, [content, runLint]);

  const errorCount = lintResults.filter((r) => r.severity === "error").length;
  const warningCount = lintResults.filter((r) => r.severity === "warning").length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] w-[90vw] max-w-[1200px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
            <Dialog.Title className="text-base font-semibold text-[var(--color-text-primary)]">
              OpenAPI Spec Editor
            </Dialog.Title>
            <div className="flex items-center gap-3">
              {linting && (
                <span className="text-xs text-[var(--color-text-muted)]">Linting...</span>
              )}
              {!linting && lintResults.length > 0 && (
                <span className="flex items-center gap-2 text-xs">
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      {errorCount} error{errorCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle className="h-3 w-3" />
                      {warningCount} warning{warningCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              )}
              {!linting && lintResults.length === 0 && content.trim() && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  Valid
                </span>
              )}
              <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>

          {/* Editor + Problems */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={content}
                onChange={(v) => setContent(v ?? "")}
                language="yaml"
                height="100%"
              />
            </div>

            {/* Problems panel */}
            {lintResults.length > 0 && (
              <div className="w-80 overflow-auto border-l border-[var(--color-border)] bg-[var(--color-bg)]">
                <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Problems ({lintResults.length})
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {lintResults.map((r, i) => (
                    <div key={i} className="px-3 py-2">
                      <div className="flex items-start gap-1.5">
                        {r.severity === "error" ? (
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                        ) : r.severity === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-400" />
                        ) : (
                          <Info className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                        )}
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {r.message}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                        Line {r.line}:{r.character} · {r.code}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-6 py-3">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
            >
              Cancel
            </button>
            {onSave && (
              <button
                onClick={() => {
                  onSave(content);
                  onOpenChange(false);
                }}
                disabled={errorCount > 0}
                className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
