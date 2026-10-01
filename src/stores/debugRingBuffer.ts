/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Buffer circular del DEBUG-MODE: tamaño fijo, los eventos más antiguos se
 * descartan al entrar nuevos. Función pura (testeable) — el store solo
 * guarda el resultado y acumula el contador de descartados para mostrarlo.
 */

export const MAX_DEBUG_ENTRIES = 300;

export function appendToRing<T>(
  entries: readonly T[],
  next: T,
  max: number = MAX_DEBUG_ENTRIES,
): { entries: T[]; dropped: number } {
  const merged = [...entries, next];
  const overflow = Math.max(0, merged.length - max);
  return { entries: overflow > 0 ? merged.slice(overflow) : merged, dropped: overflow };
}
