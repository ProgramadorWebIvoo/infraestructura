/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resumen ejecutivo de Presidencia. Fetch de GET /api/dashboard/summary
 * (agregados exactos server-side) con polling de 25s, y fallback a cálculo
 * cliente (computeDashboardSummary) cuando el endpoint no responde — así el
 * dashboard nunca queda vacío y la bandera isExact indica si los números son
 * los oficiales del servidor o una aproximación local.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardSummary, Project } from "../types";
import { apiFetch } from "../services/api";
import { useAuth } from "./useAuth";
import { usePolling } from "./usePolling";
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
  const [serverSummary, setServerSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const clientSummary = useMemo(() => computeDashboardSummary(projects), [projects]);

  const load = useCallback(
    async (isPoll = false) => {
      if (!authToken) return;
      try {
        const data = await apiFetch<DashboardSummary>("/dashboard/summary", { token: authToken });
        setServerSummary(data);
        setLastSync(new Date());
      } catch {
        // Silencioso: se usa el fallback cliente (computeDashboardSummary)
      } finally {
        if (!isPoll) setIsLoading(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    load();
  }, [load]);

  usePolling(useCallback(() => load(true), [load]), 25_000, !!authToken);

  return {
    summary: serverSummary ?? clientSummary,
    isExact: serverSummary !== null,
    isLoading,
    lastSync,
  };
}
