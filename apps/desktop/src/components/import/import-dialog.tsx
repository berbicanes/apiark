import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { Upload, FileJson, FolderOpen, AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { ImportFormat, ImportPreview } from "@apiark/types";
import {
  detectImportFormat,
  importPreview as getImportPreview,
  importCollection,
} from "@/lib/tauri-api";
import { useCollectionStore } from "@/stores/collection-store";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "select" | "preview" | "importing";

const FORMAT_LABELS: Record<ImportFormat, string> = {
  postman: "Postman v2.1",
  insomnia: "Insomnia (v4 / v5)",
  bruno: "Bruno",
  openapi: "OpenAPI 3.x",
  hoppscotch: "Hoppscotch",
  har: "HAR (HTTP Archive)",
};

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("select");
  const [filePath, setFilePath] = useState("");
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [targetDir, setTargetDir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const { openCollection } = useCollectionStore();

  const reset = useCallback(() => {
    setStep("select");
    setFilePath("");
    setFormat(null);
    setPreview(null);
    setTargetDir("");
    setError(null);
    setImporting(false);
    setResult(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset],
  );

  const handleSelectFile = useCallback(async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "API Collections",
            extensions: ["json", "yaml", "yml"],
          },
        ],
      });

      if (!selected) return;

      const path = typeof selected === "string" ? selected : selected;
      if (!path) return;

      setFilePath(path);
      setError(null);

      // Auto-detect format
      try {
        const detected = await detectImportFormat(path);
        setFormat(detected as ImportFormat);
      } catch {
        // Detection failed — user can pick manually
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        directory: true,
        multiple: false,
      });

      if (!selected) return;

      const path = typeof selected === "string" ? selected : selected;
      if (!path) return;

      setFilePath(path);
      setFormat("bruno");
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handlePreview = useCallback(async () => {
    if (!filePath || !format) return;

    setError(null);
    try {
      const p = await getImportPreview(filePath, format);
      setPreview(p);

      // Default target dir
      const { homeDir, join } = await import("@tauri-apps/api/path");
      const home = await homeDir();
      setTargetDir(await join(home, "ApiArk"));

      setStep("preview");
    } catch (err) {
      setError(String(err));
    }
  }, [filePath, format]);

  const handleSelectTargetDir = useCallback(async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setTargetDir(selected);
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!filePath || !format || !targetDir) return;

    setStep("importing");
    setImporting(true);
    setError(null);

    try {
      const collectionPath = await importCollection(filePath, format, targetDir);
      setResult(collectionPath);
      setImporting(false);

      // Auto-open the imported collection
      try {
        await openCollection(collectionPath);
      } catch {
        // Non-fatal: collection was created, user can open it manually
      }
    } catch (err) {
      setError(String(err));
      setImporting(false);
    }
  }, [filePath, format, targetDir, openCollection]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <Dialog.Title className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <Upload className="h-4 w-4" />
              {t("import.title")}
            </Dialog.Title>
            <Dialog.Close className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-5 py-4">
            {step === "select" && (
              <SelectStep
                filePath={filePath}
                format={format}
                error={error}
                onSelectFile={handleSelectFile}
                onSelectDirectory={handleSelectDirectory}
                onFormatChange={setFormat}
                onNext={handlePreview}
              />
            )}

            {step === "preview" && preview && (
              <PreviewStep
                preview={preview}
                targetDir={targetDir}
                error={error}
                onSelectTargetDir={handleSelectTargetDir}
                onBack={() => setStep("select")}
                onImport={handleImport}
              />
            )}

            {step === "importing" && (
              <ImportingStep
                importing={importing}
                result={result}
                error={error}
                onClose={() => handleOpenChange(false)}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SelectStep({
  filePath,
  format,
  error,
  onSelectFile,
  onSelectDirectory,
  onFormatChange,
  onNext,
}: {
  filePath: string;
  format: ImportFormat | null;
  error: string | null;
  onSelectFile: () => void;
  onSelectDirectory: () => void;
  onFormatChange: (f: ImportFormat) => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {t("import.source")}
        </label>
        <div className="flex gap-2">
          <button
            onClick={onSelectFile}
            className="flex flex-1 items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:border-blue-500 hover:text-[var(--color-text-primary)]"
          >
            <FileJson className="h-4 w-4" />
            {t("import.selectFile")}
          </button>
          <button
            onClick={onSelectDirectory}
            className="flex flex-1 items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:border-blue-500 hover:text-[var(--color-text-primary)]"
          >
            <FolderOpen className="h-4 w-4" />
            {t("import.selectFolder")}
          </button>
        </div>
        {filePath && (
          <p className="truncate text-xs text-[var(--color-text-dimmed)]">{filePath}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {t("import.format")} {format && <span className="text-green-500">{t("import.autoDetect")}</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(FORMAT_LABELS) as ImportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => onFormatChange(f)}
              className={`rounded border px-3 py-1.5 text-sm ${
                format === f
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!filePath || !format}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("import.next")}
        </button>
      </div>
    </div>
  );
}

function PreviewStep({
  preview,
  targetDir,
  error,
  onSelectTargetDir,
  onBack,
  onImport,
}: {
  preview: ImportPreview;
  targetDir: string;
  error: string | null;
  onSelectTargetDir: () => void;
  onBack: () => void;
  onImport: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          {preview.collectionName}
        </h3>
        <div className="mt-2 flex gap-4 text-xs text-[var(--color-text-secondary)]">
          <span>{preview.requestCount} request{preview.requestCount !== 1 ? "s" : ""}</span>
          <span>{preview.folderCount} folder{preview.folderCount !== 1 ? "s" : ""}</span>
          <span>{preview.environmentCount} environment{preview.environmentCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {preview.warnings.length > 0 && (
        <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-yellow-500/30 bg-yellow-500/5 p-3">
          <p className="flex items-center gap-1 text-xs font-medium text-yellow-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            {preview.warnings.length} warning{preview.warnings.length !== 1 ? "s" : ""}
          </p>
          {preview.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-400/80">
              <span className="font-medium">{w.itemName}:</span> {w.message}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {t("import.saveTo")}
        </label>
        <button
          onClick={onSelectTargetDir}
          className="w-full truncate rounded border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:border-blue-500"
        >
          {targetDir || t("import.selectDirectory")}
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
        >
          {t("import.back")}
        </button>
        <button
          onClick={onImport}
          disabled={!targetDir}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("sidebar.import")}
        </button>
      </div>
    </div>
  );
}

function ImportingStep({
  importing,
  result,
  error,
  onClose,
}: {
  importing: boolean;
  result: string | null;
  error: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 text-center">
      {importing && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-[var(--color-text-secondary)]">{t("import.importing")}</p>
        </div>
      )}

      {!importing && result && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Check className="h-8 w-8 text-green-500" />
          <p className="text-sm text-[var(--color-text-primary)]">{t("import.success")}</p>
          <p className="truncate text-xs text-[var(--color-text-dimmed)]">{result}</p>
          <button
            onClick={onClose}
            className="mt-2 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
          >
            {t("import.done")}
          </button>
        </div>
      )}

      {!importing && error && (
        <div className="flex flex-col items-center gap-3 py-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={onClose}
            className="mt-2 rounded border border-[var(--color-border)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
          >
            {t("common.close")}
          </button>
        </div>
      )}
    </div>
  );
}
