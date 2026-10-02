/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Detección de cancelaciones pedidas por el usuario (AbortController). Módulo
 * SIN dependencias a propósito: lo importan módulos de bajo nivel (logger) que
 * no deben cargar axios ni el cliente HTTP completo.
 */

/** ¿El error es una cancelación del usuario? No es un fallo: no se muestra como error. */
export function isRequestCanceled(err: unknown): boolean {
  const e = err as { code?: string; name?: string } | null;
  return e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";
}

export function canceledError(): Error {
  return Object.assign(new Error("Operación cancelada."), { name: "CanceledError", code: "ERR_CANCELED" });
}
