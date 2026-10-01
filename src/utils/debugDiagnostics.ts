/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * System Snapshot del DEBUG-MODE: JSON estructurado y SANITIZADO para pegar
 * en un reporte de bug (entorno, versión, rol, memoria, FPS y últimos
 * eventos). Función pura — quien llama le entrega los datos ya leídos.
 */

import type { DebugEntry } from "@/stores/debugStore";
import type { NetworkProfileKey } from "./debugNetworkProfile";
import type { MemorySnapshot } from "./debugPerformance";
import { sanitizeForDebug } from "./debugSanitizer";

export const DIAGNOSTIC_LOG_LIMIT = 50;

export interface DiagnosticInput {
  appVersion: string;
  buildMode: string;
  role: string | null | undefined;
  url: string;
  userAgent: string;
  platform: string;
  language: string;
  viewport: { width: number; height: number };
  online: boolean;
  memory: MemorySnapshot | null;
  fps: number | undefined;
  vitals: { lcpMs?: number; clsScore?: number; fcpMs?: number; longTasksCount: number };
  networkProfile: NetworkProfileKey;
  entries: readonly DebugEntry[];
  now?: Date;
}

export function buildDiagnosticSnapshot(input: DiagnosticInput) {
  const recent = input.entries.slice(-DIAGNOSTIC_LOG_LIMIT);

  return sanitizeForDebug({
    schema: "ivoo-debug-diagnostic",
    version: 1,
    generatedAt: (input.now ?? new Date()).toISOString(),
    app: { version: input.appVersion, mode: input.buildMode, url: input.url },
    environment: {
      userAgent: input.userAgent,
      platform: input.platform,
      language: input.language,
      viewport: `${input.viewport.width}x${input.viewport.height}`,
      online: input.online,
    },
    session: { role: input.role ?? null },
    performance: {
      memory: input.memory,
      // null = no medido (el FPS solo se mide con el tab Performance abierto).
      fps: input.fps ?? null,
      vitals: input.vitals,
    },
    network: { simulatedProfile: input.networkProfile },
    // El detalle completo solo viaja en eventos warn/error/fatal: mantiene el
    // diagnóstico pequeño y evita arrastrar payloads de requests normales.
    recentEvents: recent.map(e => ({
      id: e.id,
      at: new Date(e.timestamp).toISOString(),
      kind: e.kind,
      category: e.category,
      level: e.level ?? "info",
      label: e.label,
      detail: e.level === "warn" || e.level === "error" || e.level === "fatal" ? e.detail : undefined,
    })),
  });
}
