import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock all Tauri APIs globally
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  readTextFile: vi.fn().mockResolvedValue(""),
  copyFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({}));
vi.mock("@tauri-apps/plugin-notification", () => ({}));
vi.mock("@tauri-apps/plugin-updater", () => ({}));
