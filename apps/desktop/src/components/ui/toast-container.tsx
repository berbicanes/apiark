import { useToastStore } from "@/stores/toast-store";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

const iconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const colorMap = {
  error: "bg-[var(--color-error)]/10 border-[var(--color-error)]/20 text-[var(--color-error)]",
  warning: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20 text-[var(--color-warning)]",
  info: "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20 text-[var(--color-accent)]",
  success: "bg-[var(--color-success)]/10 border-[var(--color-success)]/20 text-[var(--color-success)]",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" role="log" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg ${colorMap[toast.type]} max-w-[400px] animate-[slideIn_0.2s_ease-out]`}
            role="alert"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
