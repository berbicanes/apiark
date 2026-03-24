// Mock Tauri plugins for Vitest
export const open = vi.fn().mockResolvedValue(null);
export const save = vi.fn().mockResolvedValue(null);
export const writeTextFile = vi.fn().mockResolvedValue(undefined);
export const readTextFile = vi.fn().mockResolvedValue("");
export const copyFile = vi.fn().mockResolvedValue(undefined);
export const Command = vi.fn();
