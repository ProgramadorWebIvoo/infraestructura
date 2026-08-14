/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings del grupo "app" (Aplicación) de CONFIG APP, consumidos por
 * componentes fuera del propio panel de configuración — mismo patrón que
 * usePollingSettings.ts (lectura pública vía GET /settings, cualquier
 * autenticado, fallback a los defaults sembrados si el fetch falla o
 * mientras carga).
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

const DEFAULT_MAX_FILE_SIZE_MB = 25;
const DEFAULT_MAX_FILE_COUNT = 10;
const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;

interface RawSetting {
  key: string;
  value: string | null;
}

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
  const [settings, setSettings] = useState<AppGroupSettings>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    apiFetch<Record<string, RawSetting[]>>("/settings", { token: "authenticated" })
      .then(data => {
        if (cancelled) return;
        const app = data.app ?? [];
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
        setSettings({
          maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
          maxFileCount,
          sessionTimeoutMs: sessionTimeoutMinutes * 60_000,
        });
      })
      .catch(err => logError("useAppGroupSettings", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
