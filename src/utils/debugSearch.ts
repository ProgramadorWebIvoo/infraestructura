/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Buscador de entradas del DEBUG-MODE: texto plano o regex. Ambos modos se
 * evalúan contra `entry.searchText`, precomputado UNA vez al capturar el
 * evento (minúsculas, tope de ~400 caracteres: etiqueta + inicio del
 * detalle — ver debugStore.ts). Por eso la regex NO ve el detalle completo
 * de payloads grandes. El tope de 400 caracteres también acota el costo de
 * una regex con backtracking; además se limita el largo del patrón.
 */

export const MAX_REGEX_LENGTH = 200;

export interface SearchMatcher {
  matches: (entry: { searchText: string }) => boolean;
  /** Mensaje para mostrar al usuario si la regex es inválida (el listado no se vacía). */
  error: string | null;
}

const MATCH_ALL: SearchMatcher = { matches: () => true, error: null };

export function buildSearchMatcher(query: string, regexMode: boolean): SearchMatcher {
  const text = query.trim();
  if (!text) return MATCH_ALL;

  if (!regexMode) {
    const needle = text.toLowerCase();
    return { matches: entry => entry.searchText.includes(needle), error: null };
  }

  if (text.length > MAX_REGEX_LENGTH) {
    return { matches: MATCH_ALL.matches, error: `Regex demasiado larga (máx. ${MAX_REGEX_LENGTH} caracteres).` };
  }
  try {
    // Sin flag "g": test() con lastIndex persistente daría resultados intermitentes.
    const pattern = new RegExp(text, "i");
    return { matches: entry => pattern.test(entry.searchText), error: null };
  } catch (e) {
    return { matches: MATCH_ALL.matches, error: `Regex inválida: ${e instanceof Error ? e.message : "error de sintaxis"}` };
  }
}
