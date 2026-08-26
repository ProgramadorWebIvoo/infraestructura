/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Intervalo de polling del dashboard, configurable desde CONFIG APP
 * (`notificaciones.polling_dashboard_segundos`) — antes hardcodeado en
 * useDashboardSummary, con el mismo default que la migración de settings
 * define en BD. Fallback al valor por defecto mientras carga o si el fetch
 * falla.
 *
 * (Las notificaciones dejaron de usar polling al migrar a WebSocket —
 * Laravel Reverb — así que `polling_notificaciones_segundos` se retiró de
 * CONFIG APP y de este hook; el dashboard de Presidencia sigue con polling
 * propio, fuera de esa migración.)
 *
 * Proyección pura sobre PublicSettingsProvider (fetch único y compartido de
 * /settings para toda la sesión) — antes este hook hacía su propio fetch
 * independiente, duplicando el mismo GET /settings que useMaxAdvancePercent/
 * useBudgetSemaphore/etc. ya pedían por su cuenta.
 */

import { usePublicSettings } from "../components/UI/PublicSettingsProvider";

const DEFAULT_DASHBOARD_POLL_SECONDS = 25;

export interface PollingSettings {
  dashboardIntervalMs: number;
}

function parseSeconds(raw: string | null | undefined, fallbackSeconds: number): number {
  const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackSeconds;
}

export function usePollingSettings(): PollingSettings {
  const { settings } = usePublicSettings();
  const notificaciones = settings.notificaciones ?? [];

  const dashboardSeconds = parseSeconds(
    notificaciones.find(s => s.key === "polling_dashboard_segundos")?.value,
    DEFAULT_DASHBOARD_POLL_SECONDS,
  );

  return {
    dashboardIntervalMs: dashboardSeconds * 1000,
  };
}
