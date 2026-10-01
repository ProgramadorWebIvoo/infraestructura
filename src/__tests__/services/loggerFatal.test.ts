import { describe, it, expect, beforeEach, vi } from "vitest";
import { logFatal, setErrorSink } from "@/services/logger";
import { useDebugStore } from "@/stores/debugStore";

describe("logFatal", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDebugStore.setState({ enabled: true, paused: false, entries: [], dropped: 0 });
  });

  it("registra con nivel fatal y notifica al sink de monitoreo", () => {
    const sink = vi.fn();
    setErrorSink(sink);
    logFatal("ErrorBoundary", new Error("render roto"), "stack");
    setErrorSink(null);

    expect(useDebugStore.getState().entries[0]).toMatchObject({ level: "fatal", label: "ErrorBoundary: render roto" });
    expect(sink).toHaveBeenCalledOnce();
  });
});
