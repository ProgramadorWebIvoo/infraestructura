/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente HTTP agnóstico de plataforma.
 * Cada plataforma (web, mobile) debe llamar a `setApiBaseUrl(url)` antes de
 * usar `apiFetch`, y opcionalmente `setTokenRefreshHandler` para renovación
 * transparente de tokens.
 */

// ---------------------------------------------------------------------------
// Configuración global (por plataforma)
// ---------------------------------------------------------------------------
import axios, { AxiosInstance, AxiosError } from "axios";

const http: AxiosInstance = axios.create();

let _baseUrl = "";
let _onTokenRefreshed: ((token: string) => void) | null = null;

export function setApiBaseUrl(url: string): void {
  _baseUrl = url;
}

export function setTokenRefreshHandler(handler: (token: string) => void): void {
  _onTokenRefreshed = handler;
}

export function getApiBaseUrl(): string {
  return _baseUrl;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ApiFetchOptions extends RequestInit {
  token?: string;
}

// ---------------------------------------------------------------------------
// Dedup de GETs concurrentes
// ---------------------------------------------------------------------------
// Varios componentes (o StrictMode duplicando efectos de montaje) pueden
// pedir la misma URL al mismo tiempo — sin esto, cada uno dispara su propio
// fetch, multiplicando el consumo del rate limit del backend por nada (la
// respuesta iba a ser idéntica). Solo GET/sin-método: mutaciones (POST/PATCH/
// PUT/DELETE) nunca deben compartir promesa entre sí. No es una caché de
// tiempo — la entrada se borra apenas la promesa resuelve o rechaza, así que
// dos llamadas secuenciales (una después de que la anterior ya terminó)
// siempre disparan su propio fetch nuevo; solo se deduplican las que están
// realmente en vuelo al mismo tiempo.
const inFlightGets = new Map<string, Promise<unknown>>();

function isDedupableGet(options: ApiFetchOptions): boolean {
  const method = (options.method ?? "GET").toUpperCase();
  return method === "GET";
}

function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};

  if (h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => { o[k] = v; });
    return o;
  }

  if (Array.isArray(h)) return Object.fromEntries(h);

  return h as Record<string, string>;
}

export class ApiError extends Error {
  attemptLog?: string[];
  status: number;

  constructor(message: string, status: number, attemptLog?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.attemptLog = attemptLog;
  }
}

const ERROR_MESSAGES: Record<number, string> = {
  401: "Sesión expirada. Inicia sesión nuevamente.",
  403: "No tienes permiso para realizar esta acción.",
  404: "El recurso solicitado no fue encontrado.",
  429: "Demasiadas solicitudes. Intenta nuevamente en un minuto.",
};

function safeJsonParse(text: string): Record<string, any> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function buildApiError(status: number, text: string): ApiError {
  if (ERROR_MESSAGES[status]) {
    return new ApiError(ERROR_MESSAGES[status], status);
  }

  const body = safeJsonParse(text);

  if (status === 422) {
    const firstKey = body?.errors ? Object.keys(body.errors)[0] : null;
    const message = firstKey
      ? body?.errors[firstKey][0]
      : (body?.message ?? "Datos inválidos. Revisa la información ingresada.");
    
    return new ApiError(message, status);
  }

  if (status === 503) {
    const message = body?.error ?? "Error en la evaluación de IA. Intenta más tarde.";
    return new ApiError(message, status, body?.attemptLog);
  }

  const fallbackMessage = status >= 500 
    ? "Error interno del servidor. Intenta más tarde." 
    : `Error del servidor (${status}).`;

  return new ApiError(fallbackMessage, status);
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Wrapper tipado sobre fetch que:
 * - Prefija la base URL configurada vía setApiBaseUrl()
 * - Inyecta Authorization Bearer si se pasa `token`
 * - Setea Content-Type: application/json cuando hay body
 * - Arroja error con el mensaje del servidor si !response.ok
 * - Desenvuelve `response.data ?? response` (convención Laravel)
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  if (!isDedupableGet(options)) {
    return apiFetchUncached<T>(path, options);
  }

  const key = `${path}::${options.token ?? ""}`;
  const existing = inFlightGets.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = apiFetchUncached<T>(path, options).finally(() => {
    inFlightGets.delete(key);
  });
  inFlightGets.set(key, promise);
  return promise;
}

async function apiFetchUncached<T = unknown>(
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

  let response; 
  try {
    response = await http.request<string>({
      url: `${_baseUrl}${path}`,
      method: (fetchOptions.method ?? 'GET') as any,
      headers: { ...headers, ...normalizeHeaders(fetchOptions.headers) },
      data: fetchOptions.body,
      signal: fetchOptions.signal as any,
      withCredentials: fetchOptions.credentials === "include",
      responseType: "text",
    });
  } catch (err) {
    const ex = err as AxiosError;
    if (ex.response) throw buildApiError(ex.response.status, (ex.response.data as string) ?? "");
    throw err;
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const text = (response.data ?? "") as string;

  // Si el backend renovó el token via RefreshSanctumToken middleware, lo persistimos
  const refreshedToken = response.headers["x-refresh-token"] as string | undefined;
  if (refreshedToken && _onTokenRefreshed) {
    _onTokenRefreshed(refreshedToken);
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
 * Sigue el mismo patrón de error handling que apiFetch.
 */
export async function apiDownload(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Blob> {
  const { token, ...fetchOptions } = options;

  // Sin Accept: application/json, Sanctum/Laravel puede tratar la request
  // como "de navegador" y redirigir (302) a la ruta de login en vez de
  // devolver 401 JSON cuando la sesión no es válida — fetch sigue el
  // redirect automáticamente, `response.ok` da true, y `.blob()` termina
  // devolviendo el HTML de esa página en vez del archivo real. apiFetch ya
  // manda este header; apiDownload no lo hacía, rompiendo el preview de
  // PDF/imagen en silencio mientras la descarga (que usa el mismo wrapper,
  // pero cuyo error es más visible por el nombre de archivo esperado)
  // parecía funcionar por casualidad en sesiones con cookie aún fresca.
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await http.request<Blob>({
      url: `${_baseUrl}${path}`,
      method: (fetchOptions.method ?? "GET") as any,
      headers: { ...headers, ...normalizeHeaders(fetchOptions.headers) },
      data: fetchOptions.body,
      signal: fetchOptions.signal as any,
      withCredentials: fetchOptions.credentials === "include",
      responseType: "blob",
    });
  } catch (err) {
    const ex = err as AxiosError;
    if (ex.response) {
      let message: string;
      try {
        const text = await (ex.response.data as unknown as Blob).text();
        const body = JSON.parse(text);
        message = body.message ?? body.error ?? `Error al descargar (${ex.response.status})`;
      } catch {
        message = `Error al descargar (${ex.response.status})`;
      }
      throw new Error(message);
    }
    throw err;
  }

  const refreshedToken = response.headers["x-refresh-token"] as string | undefined;
  if (refreshedToken && _onTokenRefreshed) {
    _onTokenRefreshed(refreshedToken);
  }

  return response.data;
}
