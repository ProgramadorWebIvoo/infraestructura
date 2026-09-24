/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auditoría del flujo regular de proyectos — visible para cualquier
 * autenticado (incl. Presidencia). Separado de useConfigAuditLogs (exclusivo
 * SUPERADMIN, cambios de CONFIG APP/administración).
 *
 * Mismo patrón que useConfigAuditLogs: paginado + filtros server-side (no
 * scroll infinito). Antes AuditLogSection (PresidenciaDashboard) filtraba
 * client-side sobre el `auditLogs` que trae useProjectsData para el polling
 * general de la app — un array acotado a `per_page` (200 por defecto, ver
 * AuditLogController::index) sin paginación real, así que un registro más
 * viejo que ese corte era invisible a cualquier búsqueda o filtro. Este hook
 * es independiente de ese fetch de polling: pide directamente al backend con
 * los filtros activos, así que "buscar" encuentra cualquier registro de toda
 * la tabla, sin importar cuántos haya.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { AuditLog } from "@/types";
import { useDebounce } from "./useDebounce";

export interface AuditLogFilters {
  q: string;
  role: string;
  projectId: string;
  action: string;
  user: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_AUDIT_LOG_FILTERS: AuditLogFilters = {
  q: "",
  role: "",
  projectId: "",
  action: "",
  user: "",
  dateFrom: "",
  dateTo: "",
};

export interface AuditLogPage {
  items: AuditLog[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}

export interface AuditLogSummary {
  total: number;
  withoutProject: number;
  byRole: { role: string; total: number }[];
  byAction: { action: string; total: number }[];
  byProject: { projectId: string; projectTitle: string | null; total: number }[];
  daily: { day: string; total: number }[];
}

const PER_PAGE = 25;

/** Serializa los filtros efectivos a query params — usado por `load`, `exportQuery` y el fetch de `summary`. */
function toParams(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.role) params.set("role", filters.role);
  if (filters.projectId.trim()) params.set("project_id", filters.projectId.trim());
  if (filters.action) params.set("action", filters.action);
  if (filters.user.trim()) params.set("user", filters.user.trim());
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  return params;
}

export function useAuditLogs(authToken: string, enabled: boolean) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_AUDIT_LOG_FILTERS);

  const debouncedQuery = useDebounce(filters.q, 350);
  const debouncedUser = useDebounce(filters.user, 350);

  // Filtros efectivamente enviados al backend — texto libre debounced (evita
  // un fetch por tecla), el resto (selects/fechas) aplica de inmediato.
  const effectiveFilters = useMemo(
    () => ({ ...filters, q: debouncedQuery, user: debouncedUser }),
    [filters, debouncedQuery, debouncedUser],
  );

  const activeFilterCount = useMemo(
    () => Object.values(effectiveFilters).filter((v) => v.trim() !== "").length,
    [effectiveFilters],
  );

  const load = useCallback(
    async (targetPage: number) => {
      if (!authToken || !enabled) return;
      setIsLoading(true);
      try {
        const params = toParams(effectiveFilters);
        params.set("page", String(targetPage));
        params.set("per_page", String(PER_PAGE));

        const data = await apiFetch<AuditLogPage>(`/audit-logs?${params.toString()}`, { token: authToken });
        setLogs(data.items ?? []);
        setPage(data.currentPage ?? targetPage);
        setLastPage(data.lastPage ?? 1);
        setTotal(data.total ?? 0);
      } catch (err) {
        logError("useAuditLogs.load", err);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    },
    [authToken, enabled, effectiveFilters],
  );

  // Carga inicial y recarga ante cualquier cambio de filtro efectivo —
  // siempre vuelve a página 1 (un resultado de la página anterior puede ya
  // no pertenecer al conjunto filtrado nuevo).
  useEffect(() => {
    if (!enabled) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, effectiveFilters]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > lastPage || targetPage === page) return;
      load(targetPage);
    },
    [load, lastPage, page],
  );

  const updateFilter = useCallback(<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_AUDIT_LOG_FILTERS), []);

  const refresh = useCallback(() => load(page), [load, page]);

  /** Query string de los filtros/orden actuales, para pasarla tal cual a /audit-logs/export (mismo criterio que la vista actual, sin la paginación). */
  const exportQuery = useMemo(() => toParams(effectiveFilters).toString(), [effectiveFilters]);

  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsSummaryLoading(true);
    try {
      const data = await apiFetch<AuditLogSummary>(`/audit-logs/summary?${exportQuery}`, { token: authToken });
      setSummary(data);
    } catch (err) {
      logError("useAuditLogs.loadSummary", err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [authToken, enabled, exportQuery]);

  useEffect(() => {
    if (!enabled) return;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, exportQuery]);

  return {
    logs, isLoading, hasLoaded, page, lastPage, total, goToPage, refresh,
    filters, updateFilter, clearFilters, activeFilterCount, exportQuery,
    summary, isSummaryLoading,
  };
}
