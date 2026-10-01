/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layout del panel del DEBUG-MODE: acoplamiento (flotante / derecha /
 * izquierda / abajo), tamaño, opacidad y modo compacto. Funciones puras
 * (testeables); la persistencia usa `localStorage` por navegador, nunca el
 * servidor. El modo "ventana emergente" es de SESIÓN (no se persiste): abrir
 * un popup exige un gesto del usuario, que una carga de página no tiene.
 */

import type { CSSProperties } from "react";

export type DebugDock = "floating" | "right" | "left" | "bottom";
export type DebugLayoutMode = "normal" | "expanded" | "window";

export interface DebugPrefs {
  dock: DebugDock;
  width: number;
  height: number;
  /** 0.4–1: permite ver la app a través del panel. */
  opacity: number;
  /** Oculta los filtros secundarios para dejar más espacio a la lista. */
  compact: boolean;
}

export const PREFS_STORAGE_KEY = "ivoo_debug_prefs";
export const DEBUG_DOCKS: readonly DebugDock[] = ["floating", "right", "left", "bottom"];

export const DEFAULT_DEBUG_PREFS: DebugPrefs = { dock: "floating", width: 448, height: 544, opacity: 1, compact: false };

export const MIN_PANEL_WIDTH = 320;
export const MIN_PANEL_HEIGHT = 240;
export const MIN_OPACITY = 0.4;
export const MAX_OPACITY = 1;
const MAX_STORED_SIZE = 4000;
const FLOATING_MARGIN = 24;
export const RESIZE_KEY_STEP = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Valida/normaliza cualquier valor (p. ej. lo leído de localStorage, que puede estar corrupto). */
export function sanitizePrefs(raw: unknown): DebugPrefs {
  if (typeof raw !== "object" || raw === null) return DEFAULT_DEBUG_PREFS;
  const r = raw as Record<string, unknown>;
  return {
    dock: DEBUG_DOCKS.includes(r.dock as DebugDock) ? (r.dock as DebugDock) : DEFAULT_DEBUG_PREFS.dock,
    width: clamp(finiteOr(r.width, DEFAULT_DEBUG_PREFS.width), MIN_PANEL_WIDTH, MAX_STORED_SIZE),
    height: clamp(finiteOr(r.height, DEFAULT_DEBUG_PREFS.height), MIN_PANEL_HEIGHT, MAX_STORED_SIZE),
    opacity: Math.round(clamp(finiteOr(r.opacity, DEFAULT_DEBUG_PREFS.opacity), MIN_OPACITY, MAX_OPACITY) * 100) / 100,
    compact: r.compact === true,
  };
}

export function loadPrefs(): DebugPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? sanitizePrefs(JSON.parse(raw)) : DEFAULT_DEBUG_PREFS;
  } catch {
    return DEFAULT_DEBUG_PREFS;
  }
}

export function savePrefs(prefs: DebugPrefs): void {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage inaccesible: las preferencias siguen vigentes en memoria.
  }
}

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Clases (literales, no interpoladas: restricción del JIT de Tailwind) y
 * estilo en línea (tamaño/posición dinámicos) del contenedor del panel.
 */
export function computeDockLayout(
  prefs: DebugPrefs,
  viewport: Viewport,
  mode: DebugLayoutMode,
): { className: string; style: CSSProperties } {
  const base = "fixed z-50 flex flex-col overflow-hidden bg-surface shadow-2xl";

  if (mode === "window") return { className: `${base} inset-0`, style: {} };
  if (mode === "expanded") {
    return { className: `${base} inset-3 sm:inset-6 rounded-container border border-border-default`, style: {} };
  }

  const maxFloatingW = viewport.width - FLOATING_MARGIN;
  const maxFloatingH = viewport.height - FLOATING_MARGIN;

  switch (prefs.dock) {
    case "right":
      return {
        className: `${base} border-l border-border-default`,
        style: { top: 0, right: 0, bottom: 0, width: clamp(prefs.width, MIN_PANEL_WIDTH, viewport.width) },
      };
    case "left":
      return {
        className: `${base} border-r border-border-default`,
        style: { top: 0, left: 0, bottom: 0, width: clamp(prefs.width, MIN_PANEL_WIDTH, viewport.width) },
      };
    case "bottom":
      return {
        className: `${base} border-t border-border-default`,
        style: { left: 0, right: 0, bottom: 0, height: clamp(prefs.height, MIN_PANEL_HEIGHT, viewport.height) },
      };
    default:
      return {
        className: `${base} rounded-container border border-border-default`,
        style: {
          right: FLOATING_MARGIN / 2,
          bottom: FLOATING_MARGIN / 2,
          width: clamp(prefs.width, MIN_PANEL_WIDTH, maxFloatingW),
          height: clamp(prefs.height, MIN_PANEL_HEIGHT, maxFloatingH),
        },
      };
  }
}

/** Qué lados admiten arrastre según el acople (el borde que mira a la app). */
export function resizeAxes(dock: DebugDock): { horizontal: boolean; vertical: boolean } {
  return { horizontal: dock !== "bottom", vertical: dock === "floating" || dock === "bottom" };
}

/**
 * Nuevo tamaño tras arrastrar `delta` píxeles. El panel crece al alejar el
 * borde de su ancla: derecha/abajo/flotante crecen hacia la izquierda/arriba
 * (delta negativo), la izquierda crece hacia la derecha.
 */
export function computeResizedSize(
  dock: DebugDock,
  start: { width: number; height: number },
  delta: { dx: number; dy: number },
  viewport: Viewport,
): { width: number; height: number } {
  const { horizontal, vertical } = resizeAxes(dock);
  const maxW = dock === "floating" ? viewport.width - FLOATING_MARGIN : viewport.width;
  const maxH = dock === "floating" ? viewport.height - FLOATING_MARGIN : viewport.height;
  const widthDelta = dock === "left" ? delta.dx : -delta.dx;

  return {
    width: horizontal ? clamp(start.width + widthDelta, MIN_PANEL_WIDTH, maxW) : start.width,
    height: vertical ? clamp(start.height - delta.dy, MIN_PANEL_HEIGHT, maxH) : start.height,
  };
}

/** Flechas del teclado sobre el handle (accesibilidad): ← → ↑ ↓ ajustan el tamaño. */
export function keyboardResizeDelta(key: string): { dx: number; dy: number } | null {
  switch (key) {
    case "ArrowLeft": return { dx: -RESIZE_KEY_STEP, dy: 0 };
    case "ArrowRight": return { dx: RESIZE_KEY_STEP, dy: 0 };
    case "ArrowUp": return { dx: 0, dy: -RESIZE_KEY_STEP };
    case "ArrowDown": return { dx: 0, dy: RESIZE_KEY_STEP };
    default: return null;
  }
}
