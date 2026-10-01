/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Exportar / importar sesiones del DEBUG-MODE. Formato versionado:
 *   { schema: "ivoo-debug-session", version: 1, exportedAt, app, entries }
 *
 * Un archivo importado es NO CONFIABLE (lo generó otra persona/máquina):
 *  - se valida el tamaño ANTES de leerlo (hook) y de nuevo aquí;
 *  - forma estricta: whitelist de kind/level/category, máx. MAX_DEBUG_ENTRIES;
 *  - `id` y `searchText` se RECALCULAN — nunca se confía en los del archivo
 *    (un searchText enorme degradaría el filtrado);
 *  - label y detail pasan de nuevo por el sanitizador y el truncado;
 *  - claves __proto__/constructor/prototype se descartan (sanitizador);
 *  - todo se renderiza como TEXTO (React escapa; sin dangerouslySetInnerHTML
 *    ni href desde datos importados).
 */

import {
  buildSearchText,
  defaultCategory,
  prepareForDebug,
  type DebugCategory,
  type DebugEntry,
  type DebugEntryKind,
  type DebugLevel,
} from "@/stores/debugStore";
import { MAX_DEBUG_ENTRIES } from "@/stores/debugRingBuffer";
import { maskSensitiveString } from "./debugSanitizer";

export const SESSION_SCHEMA = "ivoo-debug-session";
export const SESSION_VERSION = 1;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_LABEL_CHARS = 500;
const MAX_APP_FIELD_CHARS = 60;

const KINDS: readonly DebugEntryKind[] = ["log", "http", "websocket", "error"];
const LEVELS: readonly DebugLevel[] = ["info", "warn", "error", "fatal"];
const CATEGORIES: readonly DebugCategory[] = ["SYSTEM", "NETWORK", "STATE", "USER_ACTION"];

export interface DebugSession {
  entries: DebugEntry[];
  exportedAt: string;
  app: { version?: string; mode?: string };
  /** Nombre del archivo del que vino (solo informativo, para el banner). */
  fileName?: string;
}

export type ParsedSession = { ok: true; session: DebugSession; skipped: number } | { ok: false; error: string };

export function buildSessionExport(
  entries: readonly DebugEntry[],
  app: { version: string; mode: string },
  now: Date = new Date(),
) {
  return { schema: SESSION_SCHEMA, version: SESSION_VERSION, exportedAt: now.toISOString(), app, entries };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shortString(value: unknown): string | undefined {
  return typeof value === "string" ? maskSensitiveString(value.slice(0, MAX_APP_FIELD_CHARS)) : undefined;
}

function rebuildEntry(raw: unknown, id: number): DebugEntry | null {
  if (!isRecord(raw)) return null;
  const { kind, level, category, label, timestamp, durationMs, detail } = raw;

  if (!KINDS.includes(kind as DebugEntryKind)) return null;
  if (typeof label !== "string") return null;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
  if (level !== undefined && !LEVELS.includes(level as DebugLevel)) return null;

  const safeKind = kind as DebugEntryKind;
  const safeLabel = maskSensitiveString(label.slice(0, MAX_LABEL_CHARS));
  const safeDetail =
    typeof detail === "string" || isRecord(detail) ? (prepareForDebug(detail) as DebugEntry["detail"]) : undefined;

  return {
    id,
    kind: safeKind,
    category: CATEGORIES.includes(category as DebugCategory) ? (category as DebugCategory) : defaultCategory(safeKind),
    timestamp,
    label: safeLabel,
    level: level as DebugLevel | undefined,
    durationMs: typeof durationMs === "number" && Number.isFinite(durationMs) ? durationMs : undefined,
    detail: safeDetail,
    searchText: buildSearchText(safeLabel, safeDetail),
  };
}

export function parseSessionImport(text: string): ParsedSession {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: `El archivo supera ${MAX_IMPORT_BYTES / 1024 / 1024} MB.` };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }

  if (!isRecord(data) || data.schema !== SESSION_SCHEMA) {
    return { ok: false, error: "Formato no reconocido: no es una sesión exportada por el DEBUG-MODE." };
  }
  if (data.version !== SESSION_VERSION) {
    return { ok: false, error: `Versión de sesión no soportada (${String(data.version)}).` };
  }
  if (!Array.isArray(data.entries)) {
    return { ok: false, error: "La sesión no contiene una lista de eventos." };
  }
  if (data.entries.length > MAX_DEBUG_ENTRIES) {
    return { ok: false, error: `La sesión tiene demasiados eventos (máx. ${MAX_DEBUG_ENTRIES}).` };
  }

  const entries: DebugEntry[] = [];
  let skipped = 0;
  for (const raw of data.entries) {
    const entry = rebuildEntry(raw, entries.length + 1);
    if (entry) entries.push(entry);
    else skipped++;
  }

  const app = isRecord(data.app) ? data.app : {};
  return {
    ok: true,
    skipped,
    session: {
      entries,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt.slice(0, 40) : "",
      app: { version: shortString(app.version), mode: shortString(app.mode) },
    },
  };
}
