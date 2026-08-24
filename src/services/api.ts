/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente HTTP. Re-exporta la lógica core desde @ivoo/shared e inicializa
 * la configuración específica de web (API_BASE_URL desde VITE_API_URL).
 *
 * ── Autenticación web: cookie httpOnly de sesión (Sanctum SPA) ──────────
 * A diferencia de mobile (Bearer token), el navegador nunca ve el token de
 * sesión: viaja en una cookie httpOnly que el propio backend setea/valida.
 * Lo único que el cliente JS gestiona es el token CSRF de doble-envío
 * (cookie XSRF-TOKEN, legible por diseño) requerido por Laravel en cada
 * request mutante. `apiFetch`/`apiDownload` aquí envuelven la versión de
 * @ivoo/shared para: (1) enviar `credentials: "include"` siempre, (2)
 * obtener la cookie CSRF antes de la primera mutación, (3) anexarla como
 * header `X-XSRF-TOKEN`, y (4) descartar cualquier `token` Bearer residual
 * (mobile lo usa, web ya no).
 */

import {
  setApiBaseUrl,
  setTokenRefreshHandler,
  getApiBaseUrl,
  apiFetch as sharedApiFetch,
  apiDownload as sharedApiDownload,
} from "@ivoo/shared";
import type { ApiFetchOptions } from "@ivoo/shared";
import type { ProjectDocument } from "../types";
export type { ApiFetchOptions } from "@ivoo/shared";
export { setApiBaseUrl, setTokenRefreshHandler, getApiBaseUrl };

// ---------------------------------------------------------------------------
// Inicialización de la base URL
// ---------------------------------------------------------------------------
// En dev, VITE_API_URL puede apuntar a localhost mientras el front se accede
// desde otra máquina de la red local vía IP — en ese caso se reescribe el
// host para que apunte al mismo host desde el que se sirvió el front (misma
// IP, mismo puerto de API), evitando tener que fijar la IP a mano.

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      try {
        const url = new URL(configured);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          url.hostname = currentHost;
          return url.toString().replace(/\/$/, "");
        }
      } catch {
        // configured no es una URL absoluta válida; usar tal cual
      }
    }
  }
  return configured;
}

const API_BASE_URL = resolveApiBaseUrl();
setApiBaseUrl(API_BASE_URL);

export { API_BASE_URL };

// ---------------------------------------------------------------------------
// CSRF (Sanctum SPA): cookie XSRF-TOKEN ↔ header X-XSRF-TOKEN
// ---------------------------------------------------------------------------

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie(): Promise<void> {
  if (readCookie("XSRF-TOKEN")) return;

  // getApiBaseUrl() (no la constante API_BASE_URL congelada al importar el
  // módulo) para respetar setApiBaseUrl() si algo la cambia después del boot
  // inicial (ej. tests).
  const root = getApiBaseUrl().replace(/\/api\/?$/, "");
  await fetch(`${root}/sanctum/csrf-cookie`, { credentials: "include" });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token: _webIgnoresBearer, ...rest } = options;
  const method = (options.method ?? "GET").toUpperCase();

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  };

  if (MUTATING_METHODS.has(method)) {
    await ensureCsrfCookie();
    const csrfToken = readCookie("XSRF-TOKEN");
    if (csrfToken) headers["X-XSRF-TOKEN"] = csrfToken;
  }

  return sharedApiFetch<T>(path, { ...rest, headers, credentials: "include" });
}

export async function apiDownload(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Blob> {
  const { token: _webIgnoresBearer, ...rest } = options;
  return sharedApiDownload(path, { ...rest, credentials: "include" });
}

/** Descarga un documento de proyecto y dispara el guardado en el navegador. Lanza si la descarga falla — el caller decide cómo mostrarlo (toast, etc). */
export async function downloadProjectDocument(
  projectId: string,
  doc: ProjectDocument,
  authToken: string,
): Promise<void> {
  const blob = await apiDownload(`/projects/${projectId}/documents/${doc.id}/download`, { token: authToken });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.originalName;
  a.click();
  URL.revokeObjectURL(url);
}
