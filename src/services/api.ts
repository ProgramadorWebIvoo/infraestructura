/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente HTTP centralizado para la API Laravel.
 * Único punto donde se lee VITE_API_URL.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL;

export { API_BASE_URL };

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ApiFetchOptions extends RequestInit {
  /** Auth token para Authorization: Bearer */
  token?: string;
}

// ---------------------------------------------------------------------------
// Fetch wrappers
// ---------------------------------------------------------------------------

/**
 * Wrapper tipado sobre fetch que:
 * - Prefija API_BASE_URL automáticamente
 * - Inyecta Authorization Bearer si se pasa `token`
 * - Setea Content-Type: application/json cuando hay body
 * - Arroja error con el mensaje del servidor si !response.ok
 * - Desenvuelve `response.data ?? response` (convención Laravel)
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (fetchOptions.body && typeof fetchOptions.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as Record<string, string>) },
  });

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!response.ok) {
    let message = `Error del servidor (${response.status})`;
    try {
      const body = JSON.parse(text);
      message = body.error ?? body.message ?? message;
    } catch {
      // usar mensaje por defecto
    }
    throw new Error(message);
  }

  // Algunos endpoints devuelven texto plano
  if (!text) {
    return undefined as T;
  }

  const json = JSON.parse(text);

  // Convención Laravel: los datos pueden venir envueltos en .data
  return (json.data ?? json) as T;
}

/**
 * Wrapper para descarga de archivos (blob).
 * No parsea JSON, devuelve el blob directamente.
 */
export async function apiDownload(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Blob> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Error al descargar (${response.status})`);
  }

  return response.blob();
}
