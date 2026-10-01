/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Constantes del panel del DEBUG-MODE (tabs y opciones de filtro).
 */

import type { DebugEntryKind, DebugLevel } from "@/stores/debugStore";

export type DebugPanelTab = DebugEntryKind | "query" | "info" | "actions" | "codebase" | "performance" | "storage";

export const DEBUG_PANEL_TABS: { key: DebugPanelTab; label: string }[] = [
  { key: "http", label: "Network" },
  { key: "log", label: "Logs" },
  { key: "websocket", label: "WebSocket" },
  { key: "error", label: "Errors" },
  { key: "query", label: "Queries" },
  { key: "performance", label: "Performance" },
  { key: "storage", label: "Storage" },
  { key: "codebase", label: "Codebase" },
  { key: "actions", label: "Acciones" },
  { key: "info", label: "Info" },
];

/** Tabs que no listan entradas del buffer (tienen su propio contenido). */
export const NON_ENTRY_TABS: DebugPanelTab[] = ["query", "info", "actions", "codebase", "performance", "storage"];

export const HTTP_METHOD_FILTERS = ["all", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export const HTTP_STATUS_FILTERS = ["all", "2xx", "3xx", "4xx", "5xx"] as const;

export const LEVEL_FILTERS: { key: DebugLevel | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "info", label: "Info" },
  { key: "warn", label: "Warn" },
  { key: "error", label: "Error" },
  { key: "fatal", label: "Fatal" },
];

/**
 * Cap de renderizado (no de captura): con contenido expandible, cientos de
 * filas DOM no son gratis y casi nunca hace falta ver más de las últimas
 * 200. El buffer completo sigue intacto para "Exportar todo".
 */
export const MAX_RENDERED_ROWS = 200;
