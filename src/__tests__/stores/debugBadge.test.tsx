import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import DebugPanelTrigger, { formatBadgeCount } from "@/components/UI/DebugPanel/DebugPanelTrigger";
import { countEntriesByLevel, useDebugStore } from "@/stores/debugStore";

describe("countEntriesByLevel", () => {
  it("cuenta por nivel y trata la ausencia de nivel como info", () => {
    useDebugStore.setState({ enabled: true, paused: false, entries: [], dropped: 0 });
    const push = useDebugStore.getState().push;
    push({ kind: "log", label: "a" });
    push({ kind: "log", label: "b", level: "warn" });
    push({ kind: "error", label: "c", level: "error" });
    push({ kind: "error", label: "d", level: "fatal" });
    const { entries } = useDebugStore.getState();
    expect(countEntriesByLevel(entries, ["error", "fatal"])).toBe(2);
    expect(countEntriesByLevel(entries, ["warn"])).toBe(1);
    expect(countEntriesByLevel(entries, ["info"])).toBe(1);
  });
});

describe("formatBadgeCount", () => {
  it("topa en 99+", () => {
    expect(formatBadgeCount(7)).toBe("7");
    expect(formatBadgeCount(100)).toBe("99+");
  });
});

describe("DebugPanelTrigger", () => {
  beforeEach(() => {
    useDebugStore.setState({ enabled: true, paused: false, entries: [], dropped: 0 });
  });

  it("muestra el total cuando no hay errores ni advertencias", () => {
    act(() => useDebugStore.getState().push({ kind: "http", label: "x" }));
    render(<DebugPanelTrigger onOpen={() => undefined} />);
    expect(screen.getByLabelText("1 eventos")).toBeTruthy();
  });

  it("muestra contadores separados de errores (incl. fatal) y advertencias", () => {
    render(<DebugPanelTrigger onOpen={() => undefined} />);
    act(() => {
      const push = useDebugStore.getState().push;
      push({ kind: "log", label: "w", level: "warn" });
      push({ kind: "error", label: "e", level: "error" });
      push({ kind: "error", label: "f", level: "fatal" });
    });
    expect(screen.getByLabelText("1 advertencias")).toBeTruthy();
    expect(screen.getByLabelText("2 errores")).toBeTruthy();
    expect(screen.queryByLabelText(/eventos/)).toBeNull();
  });
});
