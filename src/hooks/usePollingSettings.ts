/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Intervalos de polling configurables desde CONFIG APP
 * (`notificaciones.polling_notificaciones_segundos` y
 * `notificaciones.polling_dashboard_segundos`) — antes hardcodeados en
 * NotificationsProvider y useDashboardSummary, con el mismo default que la
 * migración de settings define en BD. Mismo patrón que useMaxAdvancePercent:
 * lectura pública vía GET /settings (cualquier autenticado, no solo
 * SUPERADMIN), fallback a los valores por defecto mientras carga o si el
 * fetch falla.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

const DEFAULT_NOTIFICATIONS_POLL_SECONDS = 8;
const DEFAULT_DASHBOARD_POLL_SECONDS = 25;

interface RawSetting {
  key: string;
  value: string | null;
}

export interface PollingSettings {
  notificationsIntervalMs: number;
  dashboardIntervalMs: number;
}

const DEFAULTS: PollingSettings = {
  notificationsIntervalMs: DEFAULT_NOTIFICATIONS_POLL_SECONDS * 1000,
  dashboardIntervalMs: DEFAULT_DASHBOARD_POLL_SECONDS * 1000,
};

function parseSeconds(raw: string | null | undefined, fallbackSeconds: number): number {
  const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackSeconds;
}

export function usePollingSettings(): PollingSettings {
  const [settings, setSettings] = useState<PollingSettings>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    apiFetch<Record<string, RawSetting[]>>("/settings", { token: "authenticated" })
      .then(data => {
        if (cancelled) return;
        const notificaciones = data.notificaciones ?? [];
        const notificationsSeconds = parseSeconds(
          notificaciones.find(s => s.key === "polling_notificaciones_segundos")?.value,
          DEFAULT_NOTIFICATIONS_POLL_SECONDS,
        );
        const dashboardSeconds = parseSeconds(
          notificaciones.find(s => s.key === "polling_dashboard_segundos")?.value,
          DEFAULT_DASHBOARD_POLL_SECONDS,
        );
        setSettings({
          notificationsIntervalMs: notificationsSeconds * 1000,
          dashboardIntervalMs: dashboardSeconds * 1000,
        });
      })
      .catch(err => logError("usePollingSettings", err));

    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
