import { describe, it, expect, vi } from "vitest";
import {
  buildSparklinePoints,
  createFpsCounter,
  detectHeapGrowth,
  rateFps,
} from "@/utils/debugPerformance";
import { buildDiagnosticSnapshot, DIAGNOSTIC_LOG_LIMIT } from "@/utils/debugDiagnostics";
import type { DebugEntry } from "@/stores/debugStore";

describe("createFpsCounter", () => {
  it("calcula FPS por ventana de 1 s", () => {
    const onFps = vi.fn();
    const counter = createFpsCounter(onFps);
    // 60 frames a ~16,67 ms
    for (let i = 0; i <= 60; i++) counter.tick(i * (1000 / 60));
    expect(onFps).toHaveBeenCalledTimes(1);
    expect(onFps.mock.calls[0][0]).toBeGreaterThanOrEqual(59);
    expect(onFps.mock.calls[0][0]).toBeLessThanOrEqual(61);
  });

  it("detecta una caída de FPS (frames lentos)", () => {
    const onFps = vi.fn();
    const counter = createFpsCounter(onFps);
    for (let i = 0; i <= 10; i++) counter.tick(i * 100); // 10 fps
    expect(onFps).toHaveBeenCalledWith(10);
  });

  it("no emite antes de cerrar la ventana", () => {
    const onFps = vi.fn();
    const counter = createFpsCounter(onFps);
    counter.tick(0);
    counter.tick(500);
    expect(onFps).not.toHaveBeenCalled();
  });
});

describe("rateFps", () => {
  it("clasifica por umbrales", () => {
    expect(rateFps(60)).toBe("good");
    expect(rateFps(40)).toBe("needs-improvement");
    expect(rateFps(12)).toBe("poor");
  });
});

describe("detectHeapGrowth", () => {
  it("no avisa con pocas muestras", () => {
    expect(detectHeapGrowth([10, 20, 30])).toBe(false);
  });

  it("avisa ante crecimiento sostenido y relevante", () => {
    const growing = Array.from({ length: 12 }, (_, i) => 50 + i * 3);
    expect(detectHeapGrowth(growing)).toBe(true);
  });

  it("no avisa si el GC recupera memoria (dientes de sierra)", () => {
    const sawtooth = Array.from({ length: 12 }, (_, i) => 50 + (i % 2 === 0 ? 0 : 12));
    expect(detectHeapGrowth(sawtooth)).toBe(false);
  });

  it("no avisa si el aumento es pequeño", () => {
    const tiny = Array.from({ length: 12 }, (_, i) => 100 + i * 0.1);
    expect(detectHeapGrowth(tiny)).toBe(false);
  });
});

describe("buildSparklinePoints", () => {
  it("normaliza al rango visible y exige 2+ valores", () => {
    expect(buildSparklinePoints([1], 100, 10)).toBe("");
    expect(buildSparklinePoints([0, 10], 100, 10)).toBe("0.0,10.0 100.0,0.0");
  });
});

function entry(partial: Partial<DebugEntry> & { id: number }): DebugEntry {
  return { kind: "log", category: "SYSTEM", timestamp: 1_700_000_000_000, label: "x", searchText: "x", ...partial };
}

describe("buildDiagnosticSnapshot", () => {
  const base = {
    appVersion: "1.2.3",
    buildMode: "development",
    role: "ADMIN",
    url: "http://localhost:3000/proyectos?token=SECRETO",
    userAgent: "UA",
    platform: "Win32",
    language: "es-VE",
    viewport: { width: 1280, height: 720 },
    online: true,
    memory: { usedMb: 50, totalMb: 80, limitMb: 4000 },
    fps: undefined,
    vitals: { lcpMs: 1200, longTasksCount: 2 },
    networkProfile: "none" as const,
    now: new Date("2026-10-01T12:00:00Z"),
  };

  it("arma el JSON estructurado y sanitiza la URL", () => {
    const snapshot = buildDiagnosticSnapshot({ ...base, entries: [] });
    expect(snapshot).toMatchObject({
      schema: "ivoo-debug-diagnostic",
      generatedAt: "2026-10-01T12:00:00.000Z",
      app: { version: "1.2.3", url: "http://localhost:3000/proyectos?token=[redacted]" },
      environment: { viewport: "1280x720", online: true },
      session: { role: "ADMIN" },
      performance: { fps: null },
    });
  });

  it("incluye solo los últimos 50 eventos y el detalle únicamente de warn/error/fatal", () => {
    const entries = Array.from({ length: 80 }, (_, i) =>
      entry({ id: i, level: i === 79 ? "error" : "info", detail: { secret: "s", n: i } }),
    );
    const snapshot = buildDiagnosticSnapshot({ ...base, entries });
    expect(snapshot.recentEvents).toHaveLength(DIAGNOSTIC_LOG_LIMIT);
    expect(snapshot.recentEvents[0].id).toBe(30);
    expect(snapshot.recentEvents[0].detail).toBeUndefined();
    expect(snapshot.recentEvents[49].detail).toEqual({ secret: "[redacted]", n: 79 });
  });
});
