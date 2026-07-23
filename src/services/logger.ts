/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logger centralizado. En producción, estos mensajes deberían enviarse
 * a un servicio externo (Sentry, Logtail, etc.). Por ahora se mantienen
 * en consola con prefijo visible para trazabilidad.
 */

const PREFIX = "[IVOO]";

export function logError(context: string, error: unknown, ...args: unknown[]): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`${PREFIX} ${context}:`, msg, ...args);
}

export function logWarn(context: string, message: string, ...args: unknown[]): void {
  console.warn(`${PREFIX} ${context}:`, message, ...args);
}

export function logInfo(context: string, message: string, ...args: unknown[]): void {
  console.info(`${PREFIX} ${context}:`, message, ...args);
}
