import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * Applies the active theme (data-theme) and accent color (data-accent)
 * to the <html> element. Listens to system preference when theme is "system".
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const accent = useSettingsStore((s) => s.settings.accentColor);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (resolved: string) => {
      root.setAttribute("data-theme", resolved);
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches ? "dark" : "light");

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (accent === "indigo") {
      root.removeAttribute("data-accent");
    } else {
      root.setAttribute("data-accent", accent);
    }
  }, [accent]);
}

/** Returns the resolved theme for components that need to know (e.g. Monaco). */
export function useResolvedTheme(): "light" | "dark" | "black" {
  const theme = useSettingsStore((s) => s.settings.theme);

  if (theme === "system") {
    // This is a static read — for dynamic system changes, useTheme handles the DOM.
    // Components calling this will re-render when settings change.
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme as "light" | "dark" | "black";
}
