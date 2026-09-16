/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helpers puros del DEBUG-MODE: generación de cURL, export a archivo y
 * formateo — separados de DebugPanel.tsx para mantenerlo enfocado en JSX
 * (regla de Utilities/ sin estado del CLAUDE.md frontend).
 */

import type { DebugEntry } from "@/stores/debugStore";

/** Reconstruye un comando cURL equivalente a partir de una entrada `kind: "http"` capturada. */
export function buildCurlCommand(entry: DebugEntry): string {
  if (typeof entry.detail === "string" || !entry.detail) return "";
  const detail = entry.detail as Record<string, unknown>;
  const method = String(detail.method ?? "GET");
  const url = String(detail.fullUrl ?? detail.path ?? "");
  const headers = (detail.requestHeaders as Record<string, string> | undefined) ?? {};
  const body = detail.requestBody;

  const parts = [`curl -X ${method}`, `'${url}'`];
  for (const [key, value] of Object.entries(headers)) {
    parts.push(`-H '${key}: ${value}'`);
  }
  if (body !== undefined && body !== null && method !== "GET") {
    parts.push(`-d '${typeof body === "string" ? body : JSON.stringify(body)}'`);
  }
  return parts.join(" \\\n  ");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Descarga un JSON en el navegador — no es un artifact sandboxeado, la app real permite `<a download>`. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Uso general (pocas iteraciones, ej. lista de queries de TanStack) — lowercasea ambos lados en cada llamada. */
export function matchesSearchText(haystack: string, query: string): boolean {
  if (!query.trim()) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

/**
 * true si `query` (YA en minúsculas — lowercasear una vez antes del
 * `.filter()`, no por entrada) aparece en `entry.searchText`, precomputado
 * una sola vez al capturar el evento (ver debugStore.ts). Evitar
 * relowercasear acá es lo que mantiene barato filtrar cientos de entradas
 * en cada keystroke.
 */
export function matchesSearch(entry: DebugEntry, queryLower: string): boolean {
  if (!queryLower) return true;
  return entry.searchText.includes(queryLower);
}
