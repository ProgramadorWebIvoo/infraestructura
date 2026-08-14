/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Intervalos de polling configurables desde CONFIG APP
 * (`notificaciones.polling_notificaciones_segundos` y
 * `notificaciones.polling_dashboard_segundos`) — antes hardcodeados en
 * NotificationsProvider y useDashboardSummary, con el mismo default que la
 * migración de settings define en BD. Fallback a los valores por defecto
 * mientras carga o si el fetch falla.
 *
 * Proyección pura sobre PublicSettingsProvider (fetch único y compartido de
 * /settings para toda la sesión) — antes este hook hacía su propio fetch
 * independiente, duplicando el mismo GET /settings que useMaxAdvancePercent/
 * useBudgetSemaphore/etc. ya pedían por su cuenta.
 */

import { usePublicSettings } from "../components/UI/PublicSettingsProvider";

const DEFAULT_NOTIFICATIONS_POLL_SECONDS = 8;
const DEFAULT_DASHBOARD_POLL_SECONDS = 25;

export interface PollingSettings {
  notificationsIntervalMs: number;
  dashboardIntervalMs: number;
}

function parseSeconds(raw: string | null | undefined, fallbackSeconds: number): number {
  const parsed = raw !== null && raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackSeconds;
}

export function usePollingSettings(): PollingSettings {
  const { settings } = usePublicSettings();
  const notificaciones = settings.notificaciones ?? [];

  const notificationsSeconds = parseSeconds(
    notificaciones.find(s => s.key === "polling_notificaciones_segundos")?.value,
    DEFAULT_NOTIFICATIONS_POLL_SECONDS,
  );
  const dashboardSeconds = parseSeconds(
    notificaciones.find(s => s.key === "polling_dashboard_segundos")?.value,
    DEFAULT_DASHBOARD_POLL_SECONDS,
  );

  return {
    notificationsIntervalMs: notificationsSeconds * 1000,
    dashboardIntervalMs: dashboardSeconds * 1000,
  };
}
