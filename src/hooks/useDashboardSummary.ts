/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resumen ejecutivo de Presidencia. Fetch de GET /api/dashboard/summary
 * (agregados exactos server-side) con polling (intervalo configurable desde
 * CONFIG APP, `polling_dashboard_segundos`, default 25s), y fallback a
 * cálculo cliente (computeDashboardSummary) cuando el endpoint no responde —
 * así el dashboard nunca queda vacío y la bandera isExact indica si los
 * números son los oficiales del servidor o una aproximación local.
 *
 * Migrado de usePolling+useState a TanStack Query: mismo comportamiento
 * observable (fallback silencioso al cómputo cliente si el fetch falla,
 * sin toast — a diferencia de otros hooks polled, acá el fallback ES la
 * respuesta al error, no un caso aparte), pero con caché compartida por
 * queryKey si más de una vista consume el dashboard a la vez.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary, Project } from "../types";
import { apiFetch } from "../services/api";
import { useAuth } from "./useAuth";
import { usePollingSettings } from "./usePollingSettings";
import { computeDashboardSummary } from "../utils/dashboardSummary";

export interface UseDashboardSummaryResult {
  summary: DashboardSummary;
  /** true cuando los números vienen del endpoint oficial; false = fallback cliente */
  isExact: boolean;
  isLoading: boolean;
  lastSync: Date | null;
}

export function useDashboardSummary(projects: Project[]): UseDashboardSummaryResult {
  const { authToken } = useAuth();
  const { dashboardIntervalMs } = usePollingSettings();
  const enabled = !!authToken;

  const clientSummary = useMemo(() => computeDashboardSummary(projects), [projects]);

  const query = useQuery({
    queryKey: ["dashboardSummary", authToken],
    queryFn: () => apiFetch<DashboardSummary>("/dashboard/summary", { token: authToken }),
    enabled,
    refetchInterval: enabled ? dashboardIntervalMs : false,
    staleTime: Math.max(dashboardIntervalMs - 5000, 0),
    retry: false,
  });

  return {
    summary: query.data ?? clientSummary,
    isExact: query.data !== undefined,
    isLoading: query.isPending && enabled,
    lastSync: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}
