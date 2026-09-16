/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logger centralizado. En producción no se escribe a `console` (evita
 * filtrar detalles internos/stack traces a cualquiera con DevTools abierto).
 * En su lugar, cada log pasa por un "sink" inyectable — conectar un
 * servicio externo (Sentry, Logtail, etc.) vía `setErrorSink()` una vez
 * que existan credenciales/DSN; sin configurar, los logs de producción
 * simplemente no se emiten a ningún lado.
 */

import { useDebugStore, pushDebugEntry, truncateForDebug } from "@/stores/debugStore";

const PREFIX = "[IVOO]";
const isProd = import.meta.env.PROD;

// Import estático (debugStore.ts no depende de nada de services/, no hay
// ciclo) — chequear `useDebugStore.getState().enabled` es una lectura
// sincrónica de una primitiva booleana, básicamente gratis. Antes esto usaba
// `import()` dinámico en cada llamada a logError/logWarn/logInfo, lo cual
// paga el costo de una Promise + lookup de módulo en CADA log de la app
// (miles por sesión), incluso con el modo apagado — justo el tipo de
// overhead que DEBUG-MODE no debería imponerle al 99% de las sesiones que
// nunca lo activan.
function pushToDebugBuffer(level: "info" | "warn" | "error", context: string, message: string, detail?: unknown): void {
  if (!useDebugStore.getState().enabled) return;
  pushDebugEntry({
    kind: "log",
    level,
    label: `${context}: ${message}`,
    detail: detail !== undefined ? { detail: truncateForDebug(detail) } : undefined,
  });
}

export type ErrorSink = (context: string, error: unknown, message: string) => void;

let errorSink: ErrorSink | null = null;

/** Conecta un servicio externo de monitoreo (ej. Sentry.captureException). */
export function setErrorSink(sink: ErrorSink | null): void {
  errorSink = sink;
}

/**
 * Extrae un mensaje legible desde cualquier tipo de error.
 * Útil en catch blocks donde `err` es `unknown`.
 */
export function getErrorMessage(error: unknown, fallback = "Error inesperado."): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

export function logError(context: string, error: unknown, ...args: unknown[]): void {
  const msg = getErrorMessage(error);
  errorSink?.(context, error, msg);
  if (!isProd) {
    console.error(`${PREFIX} ${context}:`, msg, ...args);
  }
  pushToDebugBuffer("error", context, msg, args.length ? args : undefined);
}

export function logWarn(context: string, message: string, ...args: unknown[]): void {
  if (!isProd) {
    console.warn(`${PREFIX} ${context}:`, message, ...args);
  }
  pushToDebugBuffer("warn", context, message, args.length ? args : undefined);
}

export function logInfo(context: string, message: string, ...args: unknown[]): void {
  if (!isProd) {
    console.info(`${PREFIX} ${context}:`, message, ...args);
  }
  pushToDebugBuffer("info", context, message, args.length ? args : undefined);
}
