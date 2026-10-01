/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Captura global del DEBUG-MODE: errores no manejados y Web Vitals. Cada
 * instalador devuelve su `dispose` y lleva conteo de referencias (StrictMode
 * monta/desmonta efectos dos veces en dev; el listener real solo se arma con
 * la primera referencia y se remueve con la última). Se instalan desde
 * useDebugRuntime (hooks/) SOLO mientras el modo está activo y el rol lo
 * permite — apagarlo remueve todo: costo cero para el 99% de las sesiones.
 */

import { create } from "zustand";
import type { QueryClient } from "@tanstack/react-query";
import { pushDebugEntry, prepareForDebug } from "./debugStore";

export type Dispose = () => void;

/** Envuelve un `setup` en un instalador idempotente con conteo de referencias. */
function createRefCountedInstaller(setup: () => Dispose): () => Dispose {
  let refs = 0;
  let teardown: Dispose | null = null;

  return () => {
    if (refs === 0) teardown = setup();
    refs++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      refs--;
      if (refs === 0) {
        teardown?.();
        teardown = null;
      }
    };
  };
}

// ---------------------------------------------------------------------------
// Captura global de errores no manejados
// ---------------------------------------------------------------------------
// Excepciones fuera de un try/catch (bug en un handler, error de render que
// escapó al ErrorBoundary, promesa rechazada sin .catch) no pasan por
// logError() — sin esto, el DEBUG-MODE se quedaría ciego justo para el tipo
// de error más difícil de reproducir a mano.
export const installGlobalErrorCapture = createRefCountedInstaller(() => {
  const onError = (event: ErrorEvent) => {
    pushDebugEntry({
      kind: "error",
      level: "fatal",
      label: `Uncaught: ${event.message}`,
      detail: {
        message: event.message,
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      },
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    pushDebugEntry({
      kind: "error",
      level: "error",
      label: `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      detail: {
        stack: reason instanceof Error ? reason.stack : undefined,
        reason: reason instanceof Error ? undefined : prepareForDebug(reason),
      },
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
});

// ---------------------------------------------------------------------------
// console.error / console.warn
// ---------------------------------------------------------------------------
// Cubre lo que NO pasa por logger.ts: errores de React/librerías de terceros
// (p. ej. "Warning: Each child…"). Reglas de seguridad del parche:
//  - reentrancia: pushDebugEntry → zustand/React podría volver a llamar a
//    console.error; el flag a nivel de módulo corta el bucle;
//  - anti-duplicado: logger.ts ya registra sus propios logs y los emite a
//    console con el prefijo "[IVOO]" (incluye variantes "%c[IVOO]"): se omiten;
//  - restauración: solo si console[method] sigue siendo NUESTRO parche (otra
//    herramienta pudo parchear encima); si no, el parche queda inerte
//    (`active=false`) y solo reenvía al original.
const OWN_LOGGER_MARKER = "[IVOO]";
let inConsolePatch = false;

function formatConsoleArgs(args: unknown[]): string {
  const first = args[0];
  if (typeof first === "string") return first;
  return first instanceof Error ? first.message : "(sin mensaje)";
}

function patchConsole(method: "error" | "warn", level: "error" | "warn"): Dispose {
  const original = console[method];
  let active = true;

  const patched = function (this: Console, ...args: unknown[]) {
    original.apply(this, args);
    if (!active || inConsolePatch) return;
    if (typeof args[0] === "string" && args[0].includes(OWN_LOGGER_MARKER)) return;
    inConsolePatch = true;
    try {
      pushDebugEntry({
        kind: "log",
        level,
        category: "SYSTEM",
        label: `console.${method}: ${formatConsoleArgs(args)}`,
        detail: { source: "console", args: prepareForDebug(args) as unknown[] },
      });
    } finally {
      inConsolePatch = false;
    }
  };

  console[method] = patched;
  return () => {
    active = false;
    if (console[method] === patched) console[method] = original;
  };
}

export const installConsoleCapture = createRefCountedInstaller(() => {
  const disposers = [patchConsole("error", "error"), patchConsole("warn", "warn")];
  return () => disposers.reverse().forEach((dispose) => dispose());
});

// ---------------------------------------------------------------------------
// Estado de TanStack Query (categoría STATE)
// ---------------------------------------------------------------------------
// Solo errores de queries y resultado de mutaciones — NO cada fetch exitoso
// (el polling generaría cientos de entradas por minuto y taparía lo útil).
export function installStateCapture(queryClient: QueryClient): Dispose {
  const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "error") return;
    pushDebugEntry({
      kind: "log",
      level: "error",
      category: "STATE",
      label: `Query error: ${JSON.stringify(event.query.queryKey)}`,
      detail: { queryKey: event.query.queryKey, error: prepareForDebug(event.action.error) },
    });
  });

  const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== "updated") return;
    const { action, mutation } = event;
    if (action.type !== "success" && action.type !== "error") return;
    const key = mutation.options.mutationKey;
    pushDebugEntry({
      kind: "log",
      level: action.type === "error" ? "error" : "info",
      category: "STATE",
      label: `Mutation ${action.type === "error" ? "error" : "ok"}${key ? `: ${JSON.stringify(key)}` : ""}`,
      detail: {
        mutationKey: key,
        variables: prepareForDebug(mutation.state.variables),
        error: action.type === "error" ? prepareForDebug(action.error) : undefined,
      },
    });
  });

  return () => {
    unsubscribeQueries();
    unsubscribeMutations();
  };
}

// ---------------------------------------------------------------------------
// Web Vitals — capturados en vivo para el tab "Performance"
// ---------------------------------------------------------------------------
// No usa la librería `web-vitals` (no es dependencia del proyecto — agregarla
// solo para 3 números que la Performance API nativa ya expone sería la
// definición de sobre-ingeniería).
export interface PerfMetrics {
  lcpMs?: number;
  clsScore?: number;
  fcpMs?: number;
  longTasksCount: number;
}

interface PerfState {
  perfMetrics: PerfMetrics;
  setPerfMetrics: (updater: (prev: PerfMetrics) => PerfMetrics) => void;
  resetPerfMetrics: () => void;
}

const INITIAL_PERF_METRICS: PerfMetrics = { longTasksCount: 0 };

export const usePerfStore = create<PerfState>((set) => ({
  perfMetrics: INITIAL_PERF_METRICS,
  setPerfMetrics: (updater) => set((state) => ({ perfMetrics: updater(state.perfMetrics) })),
  resetPerfMetrics: () => set({ perfMetrics: INITIAL_PERF_METRICS }),
}));

/**
 * Observers de Performance API. Envuelto en try/catch por entry type — un
 * navegador sin soporte para un `type` particular lanza en `observe()`, y
 * eso no debe tumbar la captura del resto de las métricas. Los observers son
 * `buffered`, así que al reinstalar se re-reportan las entradas previas: por
 * eso el dispose resetea las métricas (evita doble conteo de long tasks).
 */
export const installPerfObservers = createRefCountedInstaller(() => {
  if (typeof PerformanceObserver === "undefined") return () => undefined;

  const { setPerfMetrics, resetPerfMetrics } = usePerfStore.getState();
  const observers: PerformanceObserver[] = [];

  const observe = (type: string, onEntries: (list: PerformanceObserverEntryList) => void) => {
    try {
      const observer = new PerformanceObserver(onEntries);
      observer.observe({ type, buffered: true });
      observers.push(observer);
    } catch {
      // Navegador sin soporte para este entry type — la métrica queda undefined.
    }
  };

  observe("largest-contentful-paint", (list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1] as PerformanceEntry | undefined;
    if (last) setPerfMetrics((prev) => ({ ...prev, lcpMs: Math.round(last.startTime) }));
  });

  let clsScore = 0;
  observe("layout-shift", (list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (!entry.hadRecentInput) clsScore += entry.value;
    }
    setPerfMetrics((prev) => ({ ...prev, clsScore: Math.round(clsScore * 1000) / 1000 }));
  });

  observe("paint", (list) => {
    const fcpEntry = list.getEntries().find((e) => e.name === "first-contentful-paint");
    if (fcpEntry) setPerfMetrics((prev) => ({ ...prev, fcpMs: Math.round(fcpEntry.startTime) }));
  });

  observe("longtask", (list) => {
    const count = list.getEntries().length;
    setPerfMetrics((prev) => ({ ...prev, longTasksCount: prev.longTasksCount + count }));
  });

  return () => {
    observers.forEach((o) => o.disconnect());
    resetPerfMetrics();
  };
});
