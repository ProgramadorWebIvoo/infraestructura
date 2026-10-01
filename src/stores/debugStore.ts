/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Zustand del DEBUG-MODE — activable solo por ADMIN/SUPERADMIN desde
 * CONFIG APP (ver ConfigAppPanel > tab "Aplicación"). Es 100% client-side: no
 * pega al backend, no persiste en el servidor, y no afecta a otros usuarios
 * (a diferencia de los settings de useAppSettings). El flag vive en
 * localStorage para sobrevivir un F5 mientras se depura (por-navegador, no
 * por-cuenta) — el buffer de eventos en sí NO se persiste: arrancar cada
 * sesión de depuración limpio es más útil que arrastrar ruido de la sesión
 * anterior, y evita competir por la cuota de localStorage con el cache de
 * TanStack Query (ver App.tsx).
 *
 * Captura global (errores, Web Vitals): ver debugCapture.ts. Sanitización de
 * datos sensibles: ver utils/debugSanitizer.ts — `push()` es el único punto
 * de entrada al buffer, así que NADA llega sin sanear (ni al panel ni a la
 * exportación).
 */

import { create } from "zustand";
import { sanitizeForDebug, maskSensitiveString } from "@/utils/debugSanitizer";
import { notifyConnectivity, type NetworkProfileKey } from "@/utils/debugNetworkProfile";
import { appendToRing } from "./debugRingBuffer";

const STORAGE_KEY = "ivoo_debug_mode";

export type DebugEntryKind = "log" | "http" | "websocket" | "error";
export type DebugLevel = "info" | "warn" | "error" | "fatal";
export type DebugCategory = "SYSTEM" | "NETWORK" | "STATE" | "USER_ACTION";

/** Única fuente del default de categoría: http/websocket son red; log/error son del sistema. STATE y USER_ACTION se piden explícitamente. */
export function defaultCategory(kind: DebugEntryKind): DebugCategory {
  return kind === "http" || kind === "websocket" ? "NETWORK" : "SYSTEM";
}

export interface DebugEntry {
  id: number;
  kind: DebugEntryKind;
  category: DebugCategory;
  timestamp: number;
  label: string;
  detail?: Record<string, unknown> | string;
  level?: DebugLevel;
  /** Solo `kind: "http"` — usado para ordenar/filtrar por lentitud sin parsear `detail`. */
  durationMs?: number;
  /**
   * Precomputado UNA VEZ al insertar la entrada (ver push() abajo), no en
   * cada tecla de búsqueda. Buscar re-serializando `detail` por cada entrada
   * en cada keystroke escala como O(entradas × tamaño del detail) — con 500
   * entradas de red con bodies de varios KB cada una, eso es re-stringificar
   * varios MB por letra tipeada. Acá el costo se paga una sola vez, al
   * capturar el evento, y queda acotado a un string corto.
   */
  searchText: string;
}

/** Lo que un caller (services/, componentes) provee — `id`/`timestamp`/`searchText` los calcula el store en push(). */
export type PushableDebugEntry = Omit<DebugEntry, "id" | "timestamp" | "searchText" | "category"> & {
  category?: DebugCategory;
};

interface SetEnabledOptions {
  /** false = apagar solo en memoria (guardia de rol): conserva la preferencia del admin en localStorage. */
  persist?: boolean;
}

interface DebugState {
  enabled: boolean;
  paused: boolean;
  entries: DebugEntry[];
  /** Eventos descartados por el buffer circular desde que se encendió/limpió (ver debugRingBuffer.ts). */
  dropped: number;
  /** Red simulada para apiFetch/apiDownload (ver services/debugNetwork.ts). Se resetea a "none" al apagar el modo. */
  networkProfile: NetworkProfileKey;
  setNetworkProfile: (profile: NetworkProfileKey) => void;
  setEnabled: (enabled: boolean, options?: SetEnabledOptions) => void;
  setPaused: (paused: boolean) => void;
  push: (entry: PushableDebugEntry) => void;
  clear: (kind?: DebugEntryKind) => void;
}

function readInitialEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let nextId = 1;

/** Tope corto a propósito — es un índice de búsqueda, no una copia del payload (ver DebugEntry.searchText). */
const MAX_SEARCH_TEXT_CHARS = 400;

function buildSearchText(label: string, detail: DebugEntry["detail"]): string {
  const detailText = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "";
  return `${label} ${detailText}`.slice(0, MAX_SEARCH_TEXT_CHARS).toLowerCase();
}

export const useDebugStore = create<DebugState>((set, get) => ({
  enabled: readInitialEnabled(),
  paused: false,
  entries: [],
  dropped: 0,
  networkProfile: "none",

  setEnabled: (enabled, { persist = true } = {}) => {
    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
      } catch {
        // localStorage inaccesible (modo privado, cuota): el flag sigue
        // funcionando en memoria para el resto de la sesión.
      }
    }
    notifyConnectivity(get().networkProfile, "none");
    set({ enabled, paused: false, entries: [], dropped: 0, networkProfile: "none" });
  },

  setPaused: (paused) => set({ paused }),

  setNetworkProfile: (profile) => {
    notifyConnectivity(get().networkProfile, profile);
    set({ networkProfile: profile });
  },

  push: (entry) =>
    set((state) => {
      if (!state.enabled || state.paused) return state;
      // Red de seguridad: los callers ya sanean ANTES de truncar (ver
      // prepareForDebug), pero esto garantiza que ninguna entrada llegue al
      // buffer sin pasar por el sanitizer (idempotente).
      const label = maskSensitiveString(entry.label);
      const detail = sanitizeForDebug(entry.detail);
      const next: DebugEntry = {
        ...entry,
        category: entry.category ?? defaultCategory(entry.kind),
        label,
        detail,
        id: nextId++,
        timestamp: Date.now(),
        searchText: buildSearchText(label, detail),
      };
      const { entries, dropped } = appendToRing(state.entries, next);
      return dropped > 0 ? { entries, dropped: state.dropped + dropped } : { entries };
    }),

  clear: (kind) =>
    set((state) => (kind ? { entries: state.entries.filter((e) => e.kind !== kind) } : { entries: [], dropped: 0 })),
}));

/** Empuja una entrada al buffer de debug sin necesidad de un hook — usable desde services/ (logger, api, echo). No-op si el modo está apagado o en pausa. */
export function pushDebugEntry(entry: PushableDebugEntry): void {
  useDebugStore.getState().push(entry);
}

// ---------------------------------------------------------------------------
// Truncado de payloads grandes
// ---------------------------------------------------------------------------
// Un catálogo de materiales o una lista de proyectos completa puede pesar
// varios MB en JSON — guardarla tal cual en el buffer (hasta 300 entradas)
// es la forma más directa de que "activar debug mode" termine colgando la
// pestaña por presión de memoria. Cortamos el texto serializado a un tope
// razonable para lectura humana; nadie necesita los 8000 items de un array
// para depurar, con ver la forma y los primeros alcanza.
const MAX_DEBUG_VALUE_CHARS = 20_000;
// Tope de items ANTES de serializar — sin esto, un catálogo de 8.000 items
// se stringifica completo solo para descubrir que hay que truncarlo,
// bloqueando el hilo principal por el JSON.stringify de un array gigante
// aunque el resultado final se descarte casi entero.
const MAX_DEBUG_ARRAY_ITEMS = 200;

export function truncateForDebug(value: unknown): unknown {
  if (value === undefined || value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.length > MAX_DEBUG_VALUE_CHARS
      ? `${value.slice(0, MAX_DEBUG_VALUE_CHARS)}… [truncado — ${value.length.toLocaleString("es-VE")} caracteres en total]`
      : value;
  }

  const isOversizedArray = Array.isArray(value) && value.length > MAX_DEBUG_ARRAY_ITEMS;
  const bounded = isOversizedArray ? value.slice(0, MAX_DEBUG_ARRAY_ITEMS) : value;

  let serialized: string;
  try {
    serialized = JSON.stringify(bounded);
  } catch {
    return "[no serializable]";
  }

  if (!isOversizedArray && serialized.length <= MAX_DEBUG_VALUE_CHARS) return value;

  return {
    __truncated: true,
    originalItemCount: Array.isArray(value) ? value.length : undefined,
    preview: serialized.length > MAX_DEBUG_VALUE_CHARS ? `${serialized.slice(0, MAX_DEBUG_VALUE_CHARS)}…` : serialized,
  };
}

/**
 * Forma estándar de preparar un payload para el buffer: SANEAR primero (las
 * claves sensibles solo existen mientras el valor sigue siendo un objeto) y
 * después truncar. Invertir el orden dejaría passwords/tokens dentro del
 * string `preview` de un payload grande.
 */
export function prepareForDebug(value: unknown): unknown {
  return truncateForDebug(sanitizeForDebug(value));
}
