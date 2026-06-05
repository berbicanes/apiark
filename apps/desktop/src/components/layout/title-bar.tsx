import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-react";

// macOS keeps its native traffic-light controls (titleBarStyle: Overlay), so we
// only render custom min/max/close buttons on Windows and Linux. On macOS we
// still render a draggable strip and reserve space for the native controls.
const IS_MACOS =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

/**
 * Custom application title bar.
 *
 * Native OS window decorations are disabled (see issue #65) to avoid the
 * inconsistent Gnome-style CSD header that appears on KDE/GTK. This frontend
 * bar provides a unified look across desktop environments plus a drag region
 * and window controls.
 */
export function TitleBar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
    appWindow
      .onResized(() => {
        appWindow.isMaximized().then(setIsMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => unlisten?.();
  }, []);

  const minimize = () => getCurrentWindow().minimize();
  const toggleMaximize = () => getCurrentWindow().toggleMaximize();
  const close = () => getCurrentWindow().close();

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 shrink-0 select-none items-center border-b border-[var(--color-border)] bg-[var(--color-activity-bar)]"
    >
      <div
        data-tauri-drag-region
        className={`flex flex-1 items-center overflow-hidden text-[13px] text-[var(--color-text-muted)] ${
          IS_MACOS ? "pl-[78px]" : "px-3"
        }`}
      >
        <span data-tauri-drag-region className="truncate font-medium">
          ApiArk
        </span>
      </div>

      {!IS_MACOS && (
        <div className="flex h-full items-center">
          <button
            type="button"
            onClick={minimize}
            aria-label={t("titleBar.minimize")}
            className="flex h-full w-12 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-elevated)]"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleMaximize}
            aria-label={isMaximized ? t("titleBar.restore") : t("titleBar.maximize")}
            className="flex h-full w-12 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-elevated)]"
          >
            {isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label={t("titleBar.close")}
            className="flex h-full w-12 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:bg-red-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
