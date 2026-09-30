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
import { delay, generateIdempotencyKey } from "./utils";

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
// Instrumentación opcional (DEBUG-MODE)
// ---------------------------------------------------------------------------
// Hook inyectable — este paquete no sabe nada de UI ni de localStorage; solo
// notifica cada request (éxito o error) con los datos que ya tiene a mano
// (status, timing, bodies). Quien lo registre (web: services/api.ts) decide
// qué hacer con eso. Sin registrar, no hay overhead más allá de un `if`.

export interface ApiDebugEvent {
  method: string;
  path: string;
  fullUrl: string;
  status?: number;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
}

let _onApiDebugEvent: ((event: ApiDebugEvent) => void) | null = null;

export function setApiDebugHook(hook: ((event: ApiDebugEvent) => void) | null): void {
  _onApiDebugEvent = hook;
}

function safeParseForDebug(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ApiFetchOptions extends RequestInit {
  token?: string;
  /**
   * Clave de idempotencia de la mutación (header `Idempotency-Key`). Sin ella,
   * cada llamada mutante genera una propia: protege los reintentos de red de
   * ESA llamada. Para que un segundo clic o reintento manual cuente como la
   * misma operación, el caller debe reutilizar la misma clave (ver
   * useIdempotentAction).
   */
  idempotencyKey?: string;
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
  /** Código estable del backend (p. ej. IDEMPOTENCY_IN_PROGRESS); `undefined` si el error no trae uno. */
  code?: string;
  /** Segundos que pide esperar el backend (header Retry-After), si los hay. */
  retryAfterSeconds?: number;

  constructor(message: string, status: number, attemptLog?: string[], code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.attemptLog = attemptLog;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const IDEMPOTENCY_IN_PROGRESS = "IDEMPOTENCY_IN_PROGRESS";
export const IDEMPOTENCY_KEY_REUSED = "IDEMPOTENCY_KEY_REUSED";
export const IDEMPOTENCY_KEY_REQUIRED = "IDEMPOTENCY_KEY_REQUIRED";
export const IDEMPOTENCY_RESPONSE_OMITTED = "IDEMPOTENCY_RESPONSE_OMITTED";

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

function parseRetryAfter(headers: unknown): number | undefined {
  const raw = (headers as Record<string, unknown> | undefined)?.["retry-after"];
  const seconds = Number(raw);
  return raw !== undefined && Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export function buildApiError(status: number, text: string, headers?: unknown): ApiError {
  const body = safeJsonParse(text);
  const code = typeof body?.code === "string" ? body.code : undefined;
  const retryAfterSeconds = parseRetryAfter(headers);

  // Los errores de idempotencia traen un mensaje ya redactado para el usuario.
  if (code?.startsWith("IDEMPOTENCY_") && typeof body?.message === "string") {
    return new ApiError(body.message, status, undefined, code, retryAfterSeconds);
  }

  if (ERROR_MESSAGES[status]) {
    return new ApiError(ERROR_MESSAGES[status], status, undefined, code, retryAfterSeconds);
  }

  if (status === 422) {
    const firstKey = body?.errors ? Object.keys(body.errors)[0] : null;
    const message = firstKey
      ? body?.errors[firstKey][0]
      : (body?.message ?? "Datos inválidos. Revisa la información ingresada.");
    
    return new ApiError(message, status, undefined, code);
  }

  if (status === 503) {
    const message = body?.error ?? "Error en la evaluación de IA. Intenta más tarde.";
    return new ApiError(message, status, body?.attemptLog, code);
  }

  const fallbackMessage = status >= 500 
    ? "Error interno del servidor. Intenta más tarde." 
    : `Error del servidor (${status}).`;

  return new ApiError(fallbackMessage, status, undefined, code, retryAfterSeconds);
}

// ---------------------------------------------------------------------------
// Idempotencia: reintentos seguros de mutaciones
// ---------------------------------------------------------------------------
// Reintentar una mutación es seguro solo porque viaja con la misma
// Idempotency-Key: si la primera petición sí llegó al servidor, el reintento
// recibe su respuesta guardada en vez de ejecutarse de nuevo. Se reintentan
// únicamente fallos donde el servidor no pudo haber dado una respuesta
// definitiva: red/timeout, 502/504 (proxy) y 409 IDEMPOTENCY_IN_PROGRESS
// (la original sigue corriendo). NUNCA 500/503: el 503 es el fallo de IA (gasta
// cuota) y un 500 puede traer efectos parciales.
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 3000];
const MAX_RETRY_AFTER_MS = 5000;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Rutas donde el backend NO aplica idempotencia (públicas, sin sesión, o
 * exentas por ser acciones de prueba/sincronización): reintentar ahí
 * re-ejecutaría la operación. Espejo de `config/idempotency.php` (exempt) más
 * las rutas públicas por token.
 */
const RETRY_EXCLUDED_PATHS: RegExp[] = [
  /^\/public\//,
  /^\/(login|logout|reset-password)$/,
  /^\/contractors$/,
  /^\/(push-tokens|notifications)(\/|$)/,
  /^\/ai\/config\//,
  /^\/system-keys\//,
  /^\/exchange-rates\/sync$/,
  /^\/rating-ia\/run$/,
  /^\/debug\//,
];

function isRetryableRequest(method: string, path: string): boolean {
  if (!MUTATING_METHODS.has(method)) return false;
  const pathname = path.split("?")[0];
  return !RETRY_EXCLUDED_PATHS.some((pattern) => pattern.test(pathname));
}

/** Milisegundos a esperar antes de reintentar este error, o `null` si no debe reintentarse. */
function retryDelayMs(err: AxiosError, attempt: number): number | null {
  const backoff = RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)];
  const response = err.response;

  if (!response) {
    return err.code === "ERR_CANCELED" ? null : backoff;
  }
  if (response.status === 502 || response.status === 504) return backoff;

  if (response.status === 409) {
    const apiError = buildApiError(409, (response.data as string) ?? "", response.headers);
    if (apiError.code !== IDEMPOTENCY_IN_PROGRESS) return null;
    return Math.min((apiError.retryAfterSeconds ?? backoff / 1000) * 1000, MAX_RETRY_AFTER_MS);
  }
  return null;
}

async function requestWithRetry(config: Parameters<AxiosInstance["request"]>[0], canRetry: boolean) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await http.request<string>(config);
    } catch (err) {
      const wait = canRetry && attempt < MAX_RETRIES && !config.signal?.aborted
        ? retryDelayMs(err as AxiosError, attempt)
        : null;
      if (wait === null) throw err;
      await delay(wait);
    }
  }
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
  if (MUTATING_METHODS.has((options.method ?? "GET").toUpperCase())) {
    return apiFetchMutation<T>(path, options);
  }

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

// ---------------------------------------------------------------------------
// Idempotencia por intención de la operación
// ---------------------------------------------------------------------------
// Una clave nueva por llamada no frena el doble clic (cada clic sería otra
// operación para el servidor). Por eso la identidad de una mutación es
// método + ruta + contenido del body: la MISMA operación comparte clave mientras
//  - esté en vuelo: una segunda llamada idéntica (doble clic, doble submit)
//    recibe la misma promesa y no dispara otra petición;
//  - su resultado sea desconocido (sin respuesta del servidor, 502/504, o 409
//    "en proceso"): el reintento manual reutiliza la clave y el servidor
//    responde con lo ya guardado en vez de volver a ejecutar.
// Con un resultado definitivo (éxito o error con respuesta) la clave se
// descarta: la siguiente operación igual es una nueva. Si el usuario cambia los
// datos, la identidad cambia y nace una clave nueva.
const inFlightMutations = new Map<string, Promise<unknown>>();
const pendingKeys = new Map<string, { key: string; at: number }>();
/** Una intención abandonada no debe reutilizarse horas después. */
const PENDING_KEY_TTL_MS = 10 * 60 * 1000;

/** cyrb53: hash no criptográfico de 53 bits; basta para distinguir cuerpos, no para seguridad. */
function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Huella del body; `null` si el tipo no se puede comparar (Blob, stream…): esa llamada no se deduplica. */
function bodySignature(body: unknown): string | null {
  if (body === undefined || body === null) return "";
  if (typeof body === "string") return hashString(body);
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((value, name) => {
      parts.push(typeof value === "string" ? `${name}=${value}` : `${name}=${value.name}:${value.size}:${value.lastModified}:${value.type}`);
    });
    return hashString(parts.join("&"));
  }
  return null;
}

/** ¿No sabemos si el servidor aplicó la operación? Entonces la clave debe conservarse para el reintento. */
function isOutcomeUnknown(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true; // sin respuesta: red, timeout, cancelación
  return err.status === 502 || err.status === 504 || (err.status === 409 && err.code === IDEMPOTENCY_IN_PROGRESS);
}

/** Descarta las claves pendientes (logout / cambio de usuario): no deben cruzar sesiones. */
export function resetIdempotencyState(): void {
  pendingKeys.clear();
}

async function apiFetchMutation<T>(path: string, options: ApiFetchOptions): Promise<T> {
  const signature = options.idempotencyKey ? null : bodySignature(options.body);
  if (signature === null) {
    return apiFetchUncached<T>(path, options);
  }

  const identity = `${(options.method ?? "POST").toUpperCase()} ${path} ${signature}`;

  const existing = inFlightMutations.get(identity);
  if (existing) return existing as Promise<T>;

  const pending = pendingKeys.get(identity);
  const key = pending && Date.now() - pending.at < PENDING_KEY_TTL_MS ? pending.key : generateIdempotencyKey();
  pendingKeys.set(identity, { key, at: Date.now() });

  const promise = apiFetchUncached<T>(path, { ...options, idempotencyKey: key })
    .then(
      (result) => {
        pendingKeys.delete(identity);
        return result;
      },
      (err) => {
        if (!isOutcomeUnknown(err)) pendingKeys.delete(identity);
        throw err;
      },
    )
    .finally(() => {
      inFlightMutations.delete(identity);
    });
  inFlightMutations.set(identity, promise);
  return promise;
}

async function apiFetchUncached<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, idempotencyKey, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const fullUrl = `${_baseUrl}${path}`;
  const startedAt = _onApiDebugEvent ? performance.now() : 0;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (fetchOptions.body && typeof fetchOptions.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  if (MUTATING_METHODS.has(method)) {
    headers["Idempotency-Key"] = idempotencyKey ?? generateIdempotencyKey();
  }

  const allHeaders = { ...headers, ...normalizeHeaders(fetchOptions.headers) };

  let response;
  try {
    response = await requestWithRetry({
      url: fullUrl,
      method: method as any,
      headers: allHeaders,
      data: fetchOptions.body,
      signal: fetchOptions.signal as any,
      withCredentials: fetchOptions.credentials === "include",
      responseType: "text",
    }, isRetryableRequest(method, path));
  } catch (err) {
    const ex = err as AxiosError;
    const apiError = ex.response ? buildApiError(ex.response.status, (ex.response.data as string) ?? "", ex.response.headers) : null;
    _onApiDebugEvent?.({
      method,
      path,
      fullUrl,
      status: ex.response?.status,
      durationMs: Math.round(performance.now() - startedAt),
      requestHeaders: allHeaders,
      requestBody: typeof fetchOptions.body === "string" ? safeParseForDebug(fetchOptions.body) : fetchOptions.body,
      responseBody: ex.response ? safeParseForDebug((ex.response.data as string) ?? "") : undefined,
      errorMessage: apiError?.message ?? ex.message,
    });
    if (apiError) throw apiError;
    throw err;
  }

  // Solo parsear el body para debug si hay alguien escuchando — evita pagar
  // un JSON.parse extra en cada mutación cuando DEBUG-MODE está apagado
  // (que es el caso casi siempre: nadie lo tiene activo la mayor parte del
  // tiempo, y hay usuarios que ni siquiera tienen el rol para verlo).
  const debugRequestBody = _onApiDebugEvent
    ? (typeof fetchOptions.body === "string" ? safeParseForDebug(fetchOptions.body) : fetchOptions.body)
    : undefined;

  // 204 No Content
  if (response.status === 204) {
    _onApiDebugEvent?.({
      method, path, fullUrl, status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      requestHeaders: allHeaders, requestBody: debugRequestBody, responseBody: undefined,
    });
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
    _onApiDebugEvent?.({
      method, path, fullUrl, status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      requestHeaders: allHeaders, requestBody: debugRequestBody, responseBody: undefined,
    });
    return undefined as T;
  }

  const json = JSON.parse(text);

  // Replay de una respuesta que el backend no guardó por su tamaño: la operación YA se aplicó,
  // pero no hay recurso que devolver. Se lanza en vez de entregar `{replayed:true}` a un caller
  // que espera un Project (corrompería el estado local); el siguiente refresco trae el dato real.
  if (json?.replayed === true && json?.code === IDEMPOTENCY_RESPONSE_OMITTED) {
    throw new ApiError(json.message ?? "La operación ya se había aplicado; actualiza la información.", response.status, undefined, json.code);
  }

  _onApiDebugEvent?.({
    method, path, fullUrl, status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    requestHeaders: allHeaders, requestBody: debugRequestBody, responseBody: json,
  });

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
