import { create } from "zustand";
import type { CapturedRequest, ProxyStatus } from "@/lib/tauri-api";

interface ProxyStore {
  status: ProxyStatus;
  captures: CapturedRequest[];
  selectedId: string | null;
  filter: string;

  setStatus: (status: ProxyStatus) => void;
  addCapture: (capture: CapturedRequest) => void;
  setCaptures: (captures: CapturedRequest[]) => void;
  clearCaptures: () => void;
  selectCapture: (id: string | null) => void;
  setFilter: (filter: string) => void;
}

export const useProxyStore = create<ProxyStore>((set) => ({
  status: { running: false, port: 8888, captureCount: 0 },
  captures: [],
  selectedId: null,
  filter: "",

  setStatus: (status) => set({ status }),
  addCapture: (capture) =>
    set((s) => ({
      captures: [...s.captures, capture].slice(-1000),
      status: { ...s.status, captureCount: s.status.captureCount + 1 },
    })),
  setCaptures: (captures) => set({ captures }),
  clearCaptures: () => set({ captures: [], selectedId: null }),
  selectCapture: (id) => set({ selectedId: id }),
  setFilter: (filter) => set({ filter }),
}));
