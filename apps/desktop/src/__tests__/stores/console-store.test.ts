import { describe, it, expect, beforeEach } from "vitest";
import { useConsoleStore } from "@/stores/console-store";

describe("Console Store", () => {
  beforeEach(() => {
    useConsoleStore.getState().clear();
  });

  it("adds log entries", () => {
    useConsoleStore.getState().log("test", "hello world", "log");
    const entries = useConsoleStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("test");
    expect(entries[0].message).toBe("hello world");
    expect(entries[0].level).toBe("log");
  });

  it("adds entries with different levels", () => {
    const { log } = useConsoleStore.getState();
    log("src", "info msg", "info");
    log("src", "warn msg", "warn");
    log("src", "error msg", "error");
    const entries = useConsoleStore.getState().entries;
    expect(entries).toHaveLength(3);
    expect(entries[0].level).toBe("info");
    expect(entries[1].level).toBe("warn");
    expect(entries[2].level).toBe("error");
  });

  it("clears all entries", () => {
    useConsoleStore.getState().log("test", "msg", "log");
    useConsoleStore.getState().log("test", "msg2", "log");
    expect(useConsoleStore.getState().entries).toHaveLength(2);

    useConsoleStore.getState().clear();
    expect(useConsoleStore.getState().entries).toHaveLength(0);
  });

  it("limits entries to 1000", () => {
    const { log } = useConsoleStore.getState();
    for (let i = 0; i < 1100; i++) {
      log("test", `msg ${i}`, "log");
    }
    expect(useConsoleStore.getState().entries.length).toBeLessThanOrEqual(1000);
  });

  it("toggles console open/close", () => {
    expect(useConsoleStore.getState().open).toBe(false);
    useConsoleStore.getState().toggle();
    expect(useConsoleStore.getState().open).toBe(true);
    useConsoleStore.getState().toggle();
    expect(useConsoleStore.getState().open).toBe(false);
  });

  it("sets filter", () => {
    useConsoleStore.getState().setFilter("error");
    expect(useConsoleStore.getState().filter).toBe("error");
  });
});
