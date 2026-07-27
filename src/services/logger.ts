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

const PREFIX = "[IVOO]";
const isProd = import.meta.env.PROD;

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
}

export function logWarn(context: string, message: string, ...args: unknown[]): void {
  if (!isProd) {
    console.warn(`${PREFIX} ${context}:`, message, ...args);
  }
}

export function logInfo(context: string, message: string, ...args: unknown[]): void {
  if (!isProd) {
    console.info(`${PREFIX} ${context}:`, message, ...args);
  }
}
