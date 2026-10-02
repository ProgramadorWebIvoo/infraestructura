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

import axios from "axios";
import {
  setApiBaseUrl,
  setTokenRefreshHandler,
  getApiBaseUrl,
  setApiDebugHook,
  apiFetch as sharedApiFetch,
  apiDownload as sharedApiDownload,
} from "@ivoo/shared";
import type { ApiFetchOptions as SharedApiFetchOptions, ApiDebugEvent } from "@ivoo/shared";
import type { ProjectDocument } from "@/types";
import { pushDebugEntry, prepareForDebug, useDebugStore } from "@/stores/debugStore";
import { applyDebugNetworkProfile } from "./debugNetwork";
import { prepareFormDataFiles } from "@/utils/fileUpload";
import type { TransferPhase } from "@/stores/transferStore";
import { saveBlob } from "@/utils/saveBlob";
import { trackDownload, trackUpload } from "./transferTracking";
export type { TransferProgress } from "@ivoo/shared";
export { isRequestCanceled, REQUEST_TIMEOUT } from "@ivoo/shared";
export { setApiBaseUrl, setTokenRefreshHandler, getApiBaseUrl };

export type { TransferPhase };

export interface ApiFetchOptions extends SharedApiFetchOptions {
  /** Solo subidas (FormData): informa en qué fase va (preparing → uploading → processing). */
  onPhase?: (phase: TransferPhase) => void;
  /** Solo subidas: texto que ve el usuario en el dock de transferencias (por defecto "Subiendo archivos"). */
  transferLabel?: string;
}

// ---------------------------------------------------------------------------
// DEBUG-MODE: instrumentación de red
// ---------------------------------------------------------------------------
// El hook de @ivoo/shared solo se registra MIENTRAS el modo está encendido
// (no a nivel de módulo, siempre activo) — apiFetchUncached() en el paquete
// compartido ya evita todo el trabajo de armar el evento de debug cuando el
// hook es `null` (ver comentario ahí), así que desregistrarlo cuando nadie
// lo mira es lo que hace que el 99% de las sesiones (debug apagado o sin el
// rol para verlo) paguen CERO overhead extra por request, no solo "poco".
function handleApiDebugEvent(event: ApiDebugEvent): void {
  pushDebugEntry({
    kind: "http",
    level: event.errorMessage ? "error" : "info",
    label: `${event.method} ${event.path}${event.status ? ` — ${event.status}` : ""}`,
    durationMs: event.durationMs,
    detail: {
      method: event.method,
      path: event.path,
      fullUrl: event.fullUrl,
      status: event.status,
      durationMs: event.durationMs,
      requestHeaders: prepareForDebug(event.requestHeaders),
      requestBody: prepareForDebug(event.requestBody),
      responseBody: prepareForDebug(event.responseBody),
      errorMessage: event.errorMessage,
    },
  });
}

function syncApiDebugHook(enabled: boolean): void {
  setApiDebugHook(enabled ? handleApiDebugEvent : null);
}

syncApiDebugHook(useDebugStore.getState().enabled);
useDebugStore.subscribe((state, prevState) => {
  if (state.enabled !== prevState.enabled) syncApiDebugHook(state.enabled);
});

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

export function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function ensureCsrfCookie(): Promise<void> {
  if (readCookie("XSRF-TOKEN")) return;

  // getApiBaseUrl() (no la constante API_BASE_URL congelada al importar el
  // módulo) para respetar setApiBaseUrl() si algo la cambia después del boot
  // inicial (ej. tests).
  const root = getApiBaseUrl().replace(/\/api\/?$/, "");
  await axios.get(`${root}/sanctum/csrf-cookie`, { withCredentials: true });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token: _webIgnoresBearer, onPhase, transferLabel, ...rest } = options;
  const method = (options.method ?? "GET").toUpperCase();
  await applyDebugNetworkProfile(`${method} ${path}`, options.signal);

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  };

  if (MUTATING_METHODS.has(method)) {
    await ensureCsrfCookie();
    const csrfToken = readCookie("XSRF-TOKEN");
    if (csrfToken) headers["X-XSRF-TOKEN"] = csrfToken;
  }

  // Todo archivo que sube la app viaja en un FormData por este punto: se
  // normaliza/revisa/optimiza aquí para que ningún formulario pueda saltárselo.
  if (!(MUTATING_METHODS.has(method) && rest.body instanceof FormData)) {
    return sharedApiFetch<T>(path, { ...rest, headers, credentials: "include" });
  }

  // Subida: queda registrada en transferStore (TransferDock muestra fase,
  // progreso y "Cancelar") sin que el caller tenga que hacer nada.
  const tracked = trackUpload({ label: transferLabel, signal: rest.signal, onPhase, onProgress: rest.onUploadProgress, onRetry: rest.onRetry });
  try {
    tracked.setPhase("preparing");
    const body = await prepareFormDataFiles(rest.body);
    tracked.throwIfCanceled();
    tracked.setPhase("uploading");

    return await sharedApiFetch<T>(path, {
      ...rest,
      body,
      signal: tracked.signal,
      onUploadProgress: (progress) => {
        tracked.onProgress(progress);
        // Todo el cuerpo ya llegó: el servidor está procesándolo.
        if (progress.total && progress.loaded >= progress.total) tracked.setPhase("processing");
      },
      onRetry: tracked.onRetry,
      headers,
      credentials: "include",
    });
  } finally {
    tracked.finish();
  }
}

export async function apiDownload(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Blob> {
  const { token: _webIgnoresBearer, onPhase: _uploadOnly, transferLabel, ...rest } = options;
  await applyDebugNetworkProfile(`DOWNLOAD ${path}`, options.signal);
  const startedAt = performance.now();

  // Con `transferLabel` la descarga aparece en el dock (progreso + cancelar). Sin ella no:
  // las vistas previas e imágenes cargan muchas descargas pequeñas que no deben hacer ruido.
  const tracked = transferLabel
    ? trackDownload({ label: transferLabel, signal: rest.signal, onProgress: rest.onDownloadProgress, onRetry: rest.onRetry })
    : null;

  try {
    const blob = await sharedApiDownload(path, {
      ...rest,
      ...(tracked && { signal: tracked.signal, onDownloadProgress: tracked.onProgress, onRetry: tracked.onRetry }),
      credentials: "include",
    });
    pushDebugEntry({
      kind: "http",
      level: "info",
      label: `DOWNLOAD ${path}`,
      detail: { method: "DOWNLOAD", path, durationMs: Math.round(performance.now() - startedAt), sizeBytes: blob.size, type: blob.type },
    });
    return blob;
  } catch (err) {
    pushDebugEntry({
      kind: "http",
      level: "error",
      label: `DOWNLOAD ${path}`,
      detail: { method: "DOWNLOAD", path, durationMs: Math.round(performance.now() - startedAt), errorMessage: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  } finally {
    tracked?.finish();
  }
}

/** Descarga un documento de proyecto y dispara el guardado en el navegador. Lanza si la descarga falla — el caller decide cómo mostrarlo (toast, etc). */
export async function downloadProjectDocument(
  projectId: string,
  doc: Pick<ProjectDocument, "id" | "originalName">,
  authToken: string,
): Promise<void> {
  const blob = await apiDownload(`/projects/${projectId}/documents/${doc.id}/download`, { token: authToken, transferLabel: `Descargando «${doc.originalName}»` });
  saveBlob(blob, doc.originalName);
}

/**
 * Descarga la exportación CSV de auditoría (proyectos o config) con los
 * mismos filtros activos en la vista — el backend arma el archivo completo
 * (sin paginar) vía `AuditLogController::export`/`ConfigAuditLogController::
 * export`, así que esto siempre exporta TODO lo que coincide con el filtro,
 * no solo la página cargada en pantalla.
 */
export async function downloadAuditLogsExport(
  scope: "audit-logs" | "config-audit-logs",
  queryString: string,
  authToken: string,
): Promise<void> {
  const path = queryString ? `/${scope}/export?${queryString}` : `/${scope}/export`;
  const blob = await apiDownload(path, { token: authToken, transferLabel: "Generando exportación de auditoría" });
  saveBlob(blob, `${scope === "audit-logs" ? "auditoria-proyectos" : "auditoria-configuracion"}-${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Todas las versiones (histórico completo) del grupo al que pertenece un
 * documento. `apiFetch` ya desenvuelve `response.data` internamente
 * (convención Laravel) — pedir `{ data: ProjectDocument[] }` y desestructurar
 * `.data` de nuevo aquí encima devolvía `undefined`.
 */
export async function fetchDocumentHistory(
  projectId: string,
  documentId: number,
  authToken: string,
): Promise<ProjectDocument[]> {
  return apiFetch<ProjectDocument[]>(
    `/projects/${projectId}/documents/${documentId}/history`,
    { token: authToken },
  );
}

/**
 * Histórico completo de documentos de un proyecto: todas las versiones de
 * cada grupo (no solo la vigente) + grupos eliminados (soft-delete) — a
 * diferencia de `Project.documents`, que siempre trae solo la última versión
 * viva de cada grupo (correcto para el resto de la app, pero insuficiente
 * para la tab "Archivos" de Historial de Expedientes, que necesita mostrar
 * todo lo que ocurrió, no solo el estado actual).
 */
export async function fetchAllProjectDocuments(projectId: string, authToken: string): Promise<ProjectDocument[]> {
  return apiFetch<ProjectDocument[]>(
    `/projects/${projectId}/documents?all_versions=true&include_deleted=true`,
    { token: authToken },
  );
}
