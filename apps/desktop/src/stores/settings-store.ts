import { create } from "zustand";
import type { AppSettings } from "@apiark/types";
import { getSettings, updateSettings as updateSettingsApi } from "@/lib/tauri-api";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: "dark",
  accentColor: "indigo",
  proxyUrl: null,
  proxyUsername: null,
  proxyPassword: null,
  verifySsl: true,
  followRedirects: true,
  timeoutMs: 30000,
  sidebarWidth: 256,
  onboardingComplete: false,
  crashReportsEnabled: null,
  caCertPath: null,
  clientCertPath: null,
  clientKeyPath: null,
  clientCertPassphrase: null,
  updateChannel: "stable",
  aiEndpoint: null,
  aiApiKey: null,
  aiModel: null,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  loaded: false,

  loadSettings: async () => {
    try {
      const settings = await getSettings();
      set({ settings, loaded: true });
    } catch (err) {
      // Settings load failure on startup — use defaults silently but warn
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showWarning("Could not load settings — using defaults"),
      );
      set({ loaded: true });
    }
  },

  updateSettings: async (patch) => {
    try {
      const settings = await updateSettingsApi(patch);
      set({ settings });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to save settings: ${err}`),
      );
    }
  },
}));
