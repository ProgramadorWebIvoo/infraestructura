import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  DEFAULT_DEBUG_PREFS,
  MIN_OPACITY,
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
  PREFS_STORAGE_KEY,
  computeDockLayout,
  computeResizedSize,
  keyboardResizeDelta,
  loadPrefs,
  resizeAxes,
  sanitizePrefs,
  type DebugPrefs,
} from "@/utils/debugLayout";
import { copyDocumentStyles } from "@/utils/debugPopup";
import { useDebugPrefs } from "@/hooks/useDebugPrefs";

const viewport = { width: 1440, height: 900 };
const prefs = (patch: Partial<DebugPrefs> = {}): DebugPrefs => ({ ...DEFAULT_DEBUG_PREFS, ...patch });

beforeEach(() => window.localStorage.clear());

describe("sanitizePrefs", () => {
  it("normaliza valores corruptos o fuera de rango", () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_DEBUG_PREFS);
    expect(sanitizePrefs("x")).toEqual(DEFAULT_DEBUG_PREFS);
    expect(sanitizePrefs({ dock: "diagonal", width: "ancho", height: NaN, opacity: 7, compact: "si" })).toEqual({
      ...DEFAULT_DEBUG_PREFS,
      opacity: 1,
      compact: false,
    });
    const tiny = sanitizePrefs({ width: 10, height: 10, opacity: 0 });
    expect(tiny.width).toBe(MIN_PANEL_WIDTH);
    expect(tiny.height).toBe(MIN_PANEL_HEIGHT);
    expect(tiny.opacity).toBe(MIN_OPACITY);
  });

  it("acepta preferencias válidas y 'window' nunca es un acople persistible", () => {
    expect(sanitizePrefs({ dock: "right", width: 500, height: 600, opacity: 0.7, compact: true })).toEqual({
      dock: "right", width: 500, height: 600, opacity: 0.7, compact: true,
    });
    expect(sanitizePrefs({ dock: "window" }).dock).toBe("floating");
  });

  it("loadPrefs tolera JSON roto en localStorage", () => {
    window.localStorage.setItem(PREFS_STORAGE_KEY, "{no-json");
    expect(loadPrefs()).toEqual(DEFAULT_DEBUG_PREFS);
  });
});

describe("computeDockLayout", () => {
  it("flotante: ancla abajo a la derecha y respeta el viewport", () => {
    const { style, className } = computeDockLayout(prefs({ width: 5000, height: 5000 }), viewport, "normal");
    expect(style).toMatchObject({ right: 12, bottom: 12, width: 1416, height: 876 });
    expect(className).toContain("rounded-container");
  });

  it("acoples: derecha/izquierda ocupan todo el alto; abajo todo el ancho", () => {
    expect(computeDockLayout(prefs({ dock: "right", width: 400 }), viewport, "normal").style).toEqual({ top: 0, right: 0, bottom: 0, width: 400 });
    expect(computeDockLayout(prefs({ dock: "left", width: 400 }), viewport, "normal").style).toEqual({ top: 0, left: 0, bottom: 0, width: 400 });
    expect(computeDockLayout(prefs({ dock: "bottom", height: 300 }), viewport, "normal").style).toEqual({ left: 0, right: 0, bottom: 0, height: 300 });
  });

  it("expandido y ventana ignoran acople y tamaño", () => {
    expect(computeDockLayout(prefs({ dock: "right" }), viewport, "expanded").style).toEqual({});
    expect(computeDockLayout(prefs({ dock: "right" }), viewport, "window")).toEqual({ className: expect.stringContaining("inset-0"), style: {} });
  });

  it("en un viewport diminuto el mínimo no rompe el clamp", () => {
    const { style } = computeDockLayout(prefs(), { width: 200, height: 150 }, "normal");
    expect(style.width).toBe(MIN_PANEL_WIDTH);
    expect(style.height).toBe(MIN_PANEL_HEIGHT);
  });
});

describe("resize", () => {
  const start = { width: 448, height: 544 };

  it("qué ejes admite cada acople", () => {
    expect(resizeAxes("right")).toEqual({ horizontal: true, vertical: false });
    expect(resizeAxes("left")).toEqual({ horizontal: true, vertical: false });
    expect(resizeAxes("bottom")).toEqual({ horizontal: false, vertical: true });
    expect(resizeAxes("floating")).toEqual({ horizontal: true, vertical: true });
  });

  it("derecha/flotante crecen al arrastrar hacia la izquierda/arriba; izquierda hacia la derecha", () => {
    expect(computeResizedSize("right", start, { dx: -100, dy: 50 }, viewport)).toEqual({ width: 548, height: 544 });
    expect(computeResizedSize("left", start, { dx: 100, dy: 50 }, viewport)).toEqual({ width: 548, height: 544 });
    expect(computeResizedSize("bottom", start, { dx: 30, dy: -60 }, viewport)).toEqual({ width: 448, height: 604 });
    expect(computeResizedSize("floating", start, { dx: -50, dy: -50 }, viewport)).toEqual({ width: 498, height: 594 });
  });

  it("respeta mínimos y máximos", () => {
    expect(computeResizedSize("right", start, { dx: 9999, dy: 0 }, viewport).width).toBe(MIN_PANEL_WIDTH);
    expect(computeResizedSize("right", start, { dx: -9999, dy: 0 }, viewport).width).toBe(viewport.width);
    expect(computeResizedSize("floating", start, { dx: 0, dy: -9999 }, viewport).height).toBe(viewport.height - 24);
  });

  it("flechas del teclado", () => {
    expect(keyboardResizeDelta("ArrowLeft")).toEqual({ dx: -24, dy: 0 });
    expect(keyboardResizeDelta("ArrowDown")).toEqual({ dx: 0, dy: 24 });
    expect(keyboardResizeDelta("Enter")).toBeNull();
  });
});

describe("useDebugPrefs", () => {
  it("persiste cada cambio (saneado) y se restablece", () => {
    const { result } = renderHook(() => useDebugPrefs());
    act(() => result.current.setPrefs({ dock: "left", opacity: 0.1 }));

    expect(result.current.prefs).toMatchObject({ dock: "left", opacity: MIN_OPACITY });
    expect(JSON.parse(window.localStorage.getItem(PREFS_STORAGE_KEY) as string)).toMatchObject({ dock: "left" });

    const second = renderHook(() => useDebugPrefs());
    expect(second.result.current.prefs.dock).toBe("left");

    act(() => result.current.reset());
    expect(result.current.prefs).toEqual(DEFAULT_DEBUG_PREFS);
  });
});

describe("copyDocumentStyles", () => {
  it("clona <style> y <link>, tema y clases hacia el documento del popup", () => {
    const from = document.implementation.createHTMLDocument("origen");
    from.head.innerHTML = '<style>.a{color:red}</style><link rel="stylesheet" href="/assets/app.css">';
    from.documentElement.className = "dark";
    from.documentElement.setAttribute("data-theme", "dark");
    from.body.className = "bg-slate-50";
    const to = document.implementation.createHTMLDocument("popup");

    copyDocumentStyles(from, to);

    expect(to.head.querySelectorAll("style")).toHaveLength(1);
    expect(to.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(1);
    expect(to.documentElement.className).toBe("dark");
    expect(to.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(to.body.className).toBe("bg-slate-50");
    expect(to.body.style.margin).toBe("0px");
  });
});
