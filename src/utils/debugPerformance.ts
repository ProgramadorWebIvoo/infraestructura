/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Funciones puras del tab Performance del DEBUG-MODE: lectura de memoria,
 * contador de FPS y detección de crecimiento sostenido del heap (posible
 * fuga). Hoja: sin stores ni services.
 */

export interface MemorySnapshot {
  usedMb: number;
  totalMb: number;
  limitMb: number;
}

/** performance.memory es no-estándar (solo Chromium) — null en Firefox/Safari. */
export function readMemory(): MemorySnapshot | null {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!perf.memory) return null;
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
  return {
    usedMb: toMb(perf.memory.usedJSHeapSize),
    totalMb: toMb(perf.memory.totalJSHeapSize),
    limitMb: toMb(perf.memory.jsHeapSizeLimit),
  };
}

/**
 * Contador de FPS por ventanas de ~1 s: `tick(now)` se llama en cada frame
 * (requestAnimationFrame) y `onFps` recibe el valor al cerrar cada ventana.
 */
export function createFpsCounter(onFps: (fps: number) => void, windowMs = 1000): { tick: (now: number) => void } {
  let windowStart: number | null = null;
  let frames = 0;

  return {
    tick(now) {
      if (windowStart === null) {
        windowStart = now;
        frames = 0;
        return;
      }
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= windowMs) {
        onFps(Math.round((frames * 1000) / elapsed));
        windowStart = now;
        frames = 0;
      }
    },
  };
}

export type FpsRating = "good" | "needs-improvement" | "poor";

export function rateFps(fps: number): FpsRating {
  if (fps >= 50) return "good";
  if (fps >= 30) return "needs-improvement";
  return "poor";
}

export const HEAP_HISTORY_MAX_SAMPLES = 30;
const HEAP_MIN_SAMPLES = 10;
const HEAP_MIN_GROWTH_MB = 10;
const HEAP_MIN_GROWTH_RATIO = 0.15;
const HEAP_MIN_RISING_STEPS_RATIO = 0.8;

/**
 * true si, en las últimas muestras, el heap sube casi sin bajar (el GC no
 * logra recuperarlo) y el aumento total es relevante (≥10 MB y ≥15 %).
 * Es una heurística de aviso — no prueba una fuga, solo la sugiere.
 */
export function detectHeapGrowth(samplesMb: readonly number[]): boolean {
  if (samplesMb.length < HEAP_MIN_SAMPLES) return false;
  const recent = samplesMb.slice(-HEAP_MIN_SAMPLES);
  const first = recent[0];
  const growth = recent[recent.length - 1] - first;
  if (growth < HEAP_MIN_GROWTH_MB || growth / first < HEAP_MIN_GROWTH_RATIO) return false;

  let risingSteps = 0;
  for (let i = 1; i < recent.length; i++) if (recent[i] >= recent[i - 1]) risingSteps++;
  return risingSteps / (recent.length - 1) >= HEAP_MIN_RISING_STEPS_RATIO;
}

/** Puntos "x,y" de una polilínea SVG para un sparkline (valores normalizados al rango visible). */
export function buildSparklinePoints(values: readonly number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
