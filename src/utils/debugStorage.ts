/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilidades puras del Storage Inspector del DEBUG-MODE (localStorage,
 * sessionStorage y cookies legibles). Hoja: no importa stores ni services.
 *
 * Criterios de seguridad:
 *  - la LISTA solo expone clave y tamaño; el valor se lee de forma perezosa
 *    cuando el usuario lo pide, y siempre pasa por el sanitizador;
 *  - localStorage guarda el cache persistido de TanStack Query (datos de
 *    negocio completos): por eso nunca se muestra un valor sin pedirlo ni se
 *    procesan valores de varios MB (tope MAX_STORAGE_VALUE_CHARS);
 *  - las claves que delatan un secreto se muestran como [redacted] y no se
 *    editan;
 *  - borrar/editar las claves protegidas pide un aviso explícito.
 */

import { REDACTED, isSensitiveKey, maskSensitiveString } from "./debugSanitizer";

export type StorageArea = "local" | "session" | "cookie";

/** Por encima de este tamaño el valor no se lee/muestra/edita (solo se puede borrar). */
export const MAX_STORAGE_VALUE_CHARS = 20_000;

/** Claves cuyo borrado o edición tiene efectos colaterales conocidos. */
export const PROTECTED_KEY_WARNINGS: Record<string, string> = {
  ivoo_debug_mode: "Esta clave controla el DEBUG-MODE: si la cambias, el modo puede apagarse tras recargar.",
  "XSRF-TOKEN": "Es el token CSRF de Sanctum: sin él, las mutaciones fallarán hasta que se renueve la cookie.",
};

export interface StorageRow {
  key: string;
  /** Largo del valor en caracteres. */
  length: number;
  sensitive: boolean;
  tooLarge: boolean;
  /** Advertencia a mostrar antes de editar/borrar, si la clave es especial. */
  warning?: string;
}

function toRow(key: string, length: number): StorageRow {
  return {
    key,
    length,
    sensitive: isSensitiveKey(key),
    tooLarge: length > MAX_STORAGE_VALUE_CHARS,
    warning: PROTECTED_KEY_WARNINGS[key],
  };
}

function byKey(a: StorageRow, b: StorageRow): number {
  return a.key.localeCompare(b.key);
}

function resolveStorage(area: "local" | "session"): Storage {
  return area === "local" ? window.localStorage : window.sessionStorage;
}

export function readStorageRows(area: "local" | "session"): StorageRow[] {
  try {
    const storage = resolveStorage(area);
    const rows: StorageRow[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) rows.push(toRow(key, (storage.getItem(key) ?? "").length));
    }
    return rows.sort(byKey);
  } catch {
    // Storage inaccesible (modo privado, política del navegador).
    return [];
  }
}

export function parseCookies(cookieString: string): { key: string; value: string }[] {
  return cookieString
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf("=");
      const key = index === -1 ? part : part.slice(0, index);
      const raw = index === -1 ? "" : part.slice(index + 1);
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        // valor con % mal formado: se deja crudo
      }
      return { key, value };
    });
}

/** Cookies legibles desde JS (las httpOnly, como la de sesión, NO aparecen aquí). */
export function readCookieRows(): StorageRow[] {
  return parseCookies(document.cookie).map(({ key, value }) => toRow(key, value.length)).sort(byKey);
}

/**
 * Valor listo para MOSTRAR: sanitizado y acotado. Devuelve null si la clave
 * no existe. Claves sensibles → [redacted]; valores enormes → null-safe aviso.
 */
export function readDisplayValue(area: StorageArea, key: string): string | null {
  const raw = readRawValue(area, key);
  if (raw === null) return null;
  if (isSensitiveKey(key)) return REDACTED;
  if (raw.length > MAX_STORAGE_VALUE_CHARS) {
    return `[valor demasiado grande: ${raw.length.toLocaleString("es-VE")} caracteres — no se muestra]`;
  }
  return maskSensitiveString(raw);
}

/** Valor CRUDO para el editor (solo storage, no cookies; nunca claves sensibles ni valores enormes). */
export function readEditableValue(area: "local" | "session", key: string): string | null {
  if (isSensitiveKey(key)) return null;
  const raw = readRawValue(area, key);
  return raw !== null && raw.length <= MAX_STORAGE_VALUE_CHARS ? raw : null;
}

function readRawValue(area: StorageArea, key: string): string | null {
  try {
    if (area === "cookie") return parseCookies(document.cookie).find(c => c.key === key)?.value ?? null;
    return resolveStorage(area).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageValue(area: "local" | "session", key: string, value: string): void {
  resolveStorage(area).setItem(key, value);
}

export function removeStorageKey(area: StorageArea, key: string): void {
  if (area === "cookie") {
    // Mejor esfuerzo: solo borra cookies creadas con path=/ y sin dominio explícito.
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    return;
  }
  resolveStorage(area).removeItem(key);
}
