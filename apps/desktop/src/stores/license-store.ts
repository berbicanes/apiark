import { create } from "zustand";
import {
  getLicenseStatus,
  activateLicense as activateLicenseApi,
  deactivateLicense as deactivateLicenseApi,
  type LicenseStatus,
} from "@/lib/tauri-api";

interface LicenseState {
  status: LicenseStatus;
  loaded: boolean;
  loadLicense: () => Promise<void>;
  activate: (key: string) => Promise<LicenseStatus>;
  deactivate: () => Promise<void>;
  isProFeature: (feature: string) => boolean;
}

const defaultStatus: LicenseStatus = {
  tier: "free",
  email: null,
  expiresAt: null,
  seats: null,
  gracePeriod: false,
  valid: true,
};

export const useLicenseStore = create<LicenseState>((set) => ({
  status: defaultStatus,
  loaded: false,

  loadLicense: async () => {
    try {
      const status = await getLicenseStatus();
      set({ status, loaded: true });
    } catch {
      set({ status: defaultStatus, loaded: true });
    }
  },

  activate: async (key: string) => {
    const status = await activateLicenseApi(key);
    set({ status });
    return status;
  },

  deactivate: async () => {
    const status = await deactivateLicenseApi();
    set({ status });
  },

  // All features are free — always returns true
  isProFeature: () => true,
}));
