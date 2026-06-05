import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { Play, X, Download } from "lucide-react";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useRunnerStore } from "@/stores/runner-store";
import { RunResultsTable } from "./run-results-table";
import { exportAsJson, exportAsJUnit, downloadFile } from "@/lib/export-results";
import type { RunConfig } from "@apiark/types";
import { Input } from "@/components/ui/input";

interface CollectionRunnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCollectionPath?: string;
  initialFolderPath?: string;
}

export function CollectionRunnerDialog({
  open,
  onOpenChange,
  initialCollectionPath,
  initialFolderPath,
}: CollectionRunnerDialogProps) {
  const { t } = useTranslation();
  const { collections } = useCollectionStore();
  const { environments, activeEnvironmentName } = useEnvironmentStore();
  const { isRunning, progress, summary, error, startRun, reset } = useRunnerStore();

  const [collectionPath, setCollectionPath] = useState(initialCollectionPath ?? collections[0]?.path ?? "");
  const [folderPath] = useState(initialFolderPath ?? "");
  const [environmentName, setEnvironmentName] = useState(activeEnvironmentName ?? "");
  const [delayMs, setDelayMs] = useState(0);
  const [iterations, setIterations] = useState(1);
  const [stopOnError, setStopOnError] = useState(false);

  const handleRun = () => {
    const config: RunConfig = {
      collectionPath,
      folderPath: folderPath || undefined,
      environmentName: environmentName || undefined,
      delayMs,
      iterations,
      stopOnError,
    };
    startRun(config);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isRunning) {
      if (!isOpen) reset();
      onOpenChange(isOpen);
    }
  };

  const totalProgress = progress.length;
  const totalExpected = summary
    ? summary.totalRequests
    : progress.length > 0
      ? progress[progress.length - 1].totalRequests * iterations
      : 0;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[700px] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-[var(--color-text-primary)]">
              Collection Runner
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Config */}
          {!summary && !isRunning && (
            <div className="border-b border-[var(--color-border)] px-4 py-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Collection</label>
                  <select
                    value={collectionPath}
                    onChange={(e) => setCollectionPath(e.target.value)}
                    className="w-full rounded bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none"
                  >
                    {collections.map((c) => (
                      <option key={c.path} value={c.path}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Environment</label>
                  <select
                    value={environmentName}
                    onChange={(e) => setEnvironmentName(e.target.value)}
                    className="w-full rounded bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none"
                  >
                    <option value="">{t("body.none")}</option>
                    {environments.map((e) => (
                      <option key={e.name} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Delay (ms)</label>
                  <Input
                    type="number"
                    min={0}
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="w-full rounded bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Iterations</label>
                  <Input
                    type="number"
                    min={1}
                    value={iterations}
                    onChange={(e) => setIterations(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-1.5 text-sm text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={stopOnError}
                      onChange={(e) => setStopOnError(e.target.checked)}
                      className="rounded"
                    />
                    Stop on error
                  </label>
                </div>
              </div>

              <button
                onClick={handleRun}
                disabled={!collectionPath}
                className="flex items-center gap-1.5 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                Run Collection
              </button>
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>Running... {totalProgress} / {totalExpected || "?"}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-[var(--color-elevated)]">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: totalExpected > 0 ? `${(totalProgress / totalExpected) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {/* Summary bar */}
          {summary && (
            <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-4 py-2 text-xs">
              <span className="text-[var(--color-text-secondary)]">
                Total: <strong>{summary.totalRequests}</strong>
              </span>
              <span className="text-green-500">
                Passed: <strong>{summary.totalPassed}</strong>
              </span>
              <span className="text-red-500">
                Failed: <strong>{summary.totalFailed}</strong>
              </span>
              <span className="text-[var(--color-text-muted)]">
                Time: <strong>{summary.totalTimeMs}ms</strong>
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => downloadFile(exportAsJson(summary), "results.json")}
                  className="flex items-center gap-1 rounded bg-[var(--color-elevated)] px-2 py-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                >
                  <Download className="h-3 w-3" />
                  JSON
                </button>
                <button
                  onClick={() => downloadFile(exportAsJUnit(summary), "results.xml")}
                  className="flex items-center gap-1 rounded bg-[var(--color-elevated)] px-2 py-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                >
                  <Download className="h-3 w-3" />
                  JUnit
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border-b border-[var(--color-border)] bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-auto">
            {summary ? (
              summary.iterations.map((iter) => (
                <div key={iter.iteration}>
                  {summary.iterations.length > 1 && (
                    <div className="sticky top-0 bg-[var(--color-surface)] px-4 py-1 text-xs font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      Iteration {iter.iteration + 1}
                    </div>
                  )}
                  <RunResultsTable results={iter.results} />
                </div>
              ))
            ) : (
              <RunResultsTable
                results={progress.map((p) => p.result)}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
