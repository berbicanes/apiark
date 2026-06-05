import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload } from "lucide-react";
import { parseCurlCommand } from "@/lib/tauri-api";
import { useTabStore } from "@/stores/tab-store";
import type { HttpMethod, KeyValuePair, BodyType } from "@apiark/types";
import { TextArea } from "@/components/ui/textarea";

let kvCounter = 0;
const kvId = () => `kv_${Date.now()}_${++kvCounter}`;

interface CurlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CurlImportDialog({ open, onOpenChange }: CurlImportDialogProps) {
  const [curlInput, setCurlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!curlInput.trim()) return;

    setError(null);
    setImporting(true);

    try {
      const parsed = await parseCurlCommand(curlInput.trim());

      const { newTab, setMethod, setUrl, setHeaders, setBody, setAuth } =
        useTabStore.getState();
      newTab();

      // Small delay to let tab render
      setTimeout(() => {
        setMethod(parsed.method as HttpMethod);
        setUrl(parsed.url);

        // Set headers
        const headers: KeyValuePair[] = Object.entries(parsed.headers).map(
          ([key, value]) => ({ id: kvId(), key, value, enabled: true }),
        );
        if (headers.length > 0) setHeaders([...headers, { id: kvId(), key: "", value: "", enabled: true }]);

        // Set body
        if (parsed.body) {
          setBody({
            type: (parsed.bodyType as BodyType) ?? "raw",
            content: parsed.body,
            formData: [],
          });
        }

        // Set auth
        if (parsed.authBasic) {
          setAuth({
            type: "basic",
            username: parsed.authBasic[0],
            password: parsed.authBasic[1],
          });
        }
      }, 0);

      setCurlInput("");
      onOpenChange(false);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to parse cURL command");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Upload className="h-5 w-5" />
              Import cURL
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="p-6">
            <TextArea
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder={'Paste your cURL command here...\n\ncurl -X POST https://api.example.com/users \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"name": "John"}\''}
              className="h-48 w-full resize-y rounded bg-[var(--color-elevated)] p-3 font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              spellCheck={false}
            />

            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close className="rounded px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleImport}
                disabled={!curlInput.trim() || importing}
                className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
