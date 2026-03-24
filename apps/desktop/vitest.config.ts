import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    deps: {
      inline: [/@tauri-apps/],
    },
    server: {
      deps: {
        inline: [/@tauri-apps/],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@tauri-apps/api": path.resolve(__dirname, "src/__tests__/mocks/tauri-api.ts"),
      "@tauri-apps/api/core": path.resolve(__dirname, "src/__tests__/mocks/tauri-api.ts"),
      "@tauri-apps/api/event": path.resolve(__dirname, "src/__tests__/mocks/tauri-api.ts"),
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "src/__tests__/mocks/tauri-plugins.ts"),
      "@tauri-apps/plugin-fs": path.resolve(__dirname, "src/__tests__/mocks/tauri-plugins.ts"),
      "@tauri-apps/plugin-shell": path.resolve(__dirname, "src/__tests__/mocks/tauri-plugins.ts"),
      "@tauri-apps/plugin-notification": path.resolve(__dirname, "src/__tests__/mocks/tauri-plugins.ts"),
      "@tauri-apps/plugin-updater": path.resolve(__dirname, "src/__tests__/mocks/tauri-plugins.ts"),
    },
  },
});
