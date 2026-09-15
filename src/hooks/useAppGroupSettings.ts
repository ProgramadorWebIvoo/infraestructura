/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings del grupo "app" (Aplicación) de CONFIG APP, consumidos por
 * componentes fuera del propio panel de configuración — mismo patrón que
 * usePollingSettings.ts (proyección pura sobre `publicSettingsStore`, sin
 * fetch propio).
 *
 * Antes hacía su propio `GET /settings` independiente en un `useEffect` —
 * como este hook se usa dentro de `useAuth()`, y `useAuth()` se instancia de
 * forma independiente en varios lugares (AppRoutes, PublicSettingsProvider,
 * AiFeatureGateProvider — ver PERFORMANCE-AUDIT-2026-09-15.md), cada
 * instancia disparaba su PROPIO `GET /settings`, duplicando el fetch que
 * `PublicSettingsProvider`/`publicSettingsStore` ya hace una vez por sesión
 * y cachea. Confirmado en vivo: `/api/settings` se pedía 2x al navegar a
 * Config App. Ahora lee del mismo store compartido — cero fetches propios.
 */

import { useMemo } from "react";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";

const DEFAULT_MAX_FILE_SIZE_MB = 25;
const DEFAULT_MAX_FILE_COUNT = 10;
const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;

export interface AppGroupSettings {
  maxFileSizeBytes: number;
  maxFileCount: number;
  sessionTimeoutMs: number;
}

const DEFAULTS: AppGroupSettings = {
  maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024,
  maxFileCount: DEFAULT_MAX_FILE_COUNT,
  sessionTimeoutMs: DEFAULT_SESSION_TIMEOUT_MINUTES * 60_000,
};

function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
  const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useAppGroupSettings(): AppGroupSettings {
  const app = usePublicSettingsStore(s => s.settings.app);

  return useMemo(() => {
    if (!app) return DEFAULTS;
    const maxFileSizeMb = parsePositiveInt(
      app.find(s => s.key === "documento_tamano_maximo_mb")?.value,
      DEFAULT_MAX_FILE_SIZE_MB,
    );
    const maxFileCount = parsePositiveInt(
      app.find(s => s.key === "documento_cantidad_maxima_archivos")?.value,
      DEFAULT_MAX_FILE_COUNT,
    );
    const sessionTimeoutMinutes = parsePositiveInt(
      app.find(s => s.key === "sesion_inactividad_minutos")?.value,
      DEFAULT_SESSION_TIMEOUT_MINUTES,
    );
    return {
      maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
      maxFileCount,
      sessionTimeoutMs: sessionTimeoutMinutes * 60_000,
    };
  }, [app]);
}
