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
// Token refresh handler (registrado por useAuth para evitar dependencia circular)
// ---------------------------------------------------------------------------

let onTokenRefreshed: ((token: string) => void) | null = null;

/**
 * Registra el callback que se invocará cuando el backend devuelva
 * un nuevo token via X-Refresh-Token.
 */
export function setTokenRefreshHandler(handler: (token: string) => void): void {
  onTokenRefreshed = handler;
}

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
    const status = response.status;
    let message: string;
    let attemptLog: string[] | undefined;

    if (status === 401) {
      message = "Sesión expirada. Inicia sesión nuevamente.";
    } else if (status === 403) {
      message = "No tienes permiso para realizar esta acción.";
    } else if (status === 404) {
      message = "El recurso solicitado no fue encontrado.";
    } else if (status === 422) {
      try {
        const body = JSON.parse(text);
        // Extraer el primer error de validación de Laravel
        const firstKey = Object.keys(body.errors ?? {})[0];
        message = firstKey ? body.errors[firstKey][0] : (body.message ?? "Datos inválidos.");
      } catch {
        message = "Datos inválidos. Revisa la información ingresada.";
      }
    } else if (status === 429) {
      message = "Demasiadas solicitudes. Intenta nuevamente en un minuto.";
    } else if (status === 503) {
      try {
        const body = JSON.parse(text);
        message = body.error ?? "Error en la evaluación de IA. Intenta más tarde.";
        attemptLog = body.attemptLog;
      } catch {
        message = "Error en la evaluación de IA. Intenta más tarde.";
      }
    } else if (status >= 500) {
      message = "Error interno del servidor. Intenta más tarde.";
    } else {
      message = `Error del servidor (${status}).`;
    }

    const error = new Error(message) as Error & { attemptLog?: string[] };
    if (attemptLog) error.attemptLog = attemptLog;
    throw error;
  }

  // Si el backend renovó el token via RefreshSanctumToken middleware, lo persistimos
  const refreshedToken = response.headers.get("X-Refresh-Token");
  if (refreshedToken && onTokenRefreshed) {
    onTokenRefreshed(refreshedToken);
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
