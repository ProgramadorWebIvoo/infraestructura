/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico de Obras (Presidencia): listado paginado con filtros server-side,
 * detalle de una obra y exportación del conjunto filtrado. Sin polling: es una
 * vista de consulta histórica, se refresca a demanda.
 */

import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { useDebounce } from "./useDebounce";
import type {
  ProjectHistoryDetail,
  ProjectHistoryListFilters,
  ProjectHistoryPage,
  ProjectHistoryRow,
} from "@/views/PresidenciaDashboard/projectHistoryTypes";

export const EMPTY_HISTORY_FILTERS: ProjectHistoryListFilters = {
  q: "",
  status: "",
  type: "",
  dateFrom: "",
  dateTo: "",
  withAlerts: false,
};

const PER_PAGE = 15;

function filterParams(filters: ProjectHistoryListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.withAlerts) params.set("withAlerts", "1");
  return params;
}

function toQuery(filters: ProjectHistoryListFilters, page: number): string {
  const params = filterParams(filters);
  params.set("page", String(page));
  params.set("perPage", String(PER_PAGE));
  return params.toString();
}

/** Rango de fechas incoherente (desde > hasta): el backend lo rechaza con 422, así que ni se consulta. */
export function isInvalidDateRange(filters: Pick<ProjectHistoryListFilters, "dateFrom" | "dateTo">): boolean {
  return !!filters.dateFrom && !!filters.dateTo && filters.dateFrom > filters.dateTo;
}

export function useProjectHistoryList(authToken: string) {
  const [filters, setFilters] = useState<ProjectHistoryListFilters>(EMPTY_HISTORY_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(filters.q, 350);
  const effective = { ...filters, q: debouncedQuery };
  const invalidRange = isInvalidDateRange(filters);

  const query = useQuery({
    queryKey: ["projectHistory", authToken, effective, page],
    queryFn: () => apiFetch<ProjectHistoryPage>(`/project-history?${toQuery(effective, page)}`, { token: authToken }),
    enabled: !!authToken && !invalidRange,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const updateFilter = <K extends keyof ProjectHistoryListFilters>(key: K, value: ProjectHistoryListFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_HISTORY_FILTERS);
    setPage(1);
  };

  const activeFilterCount =
    Object.values(filters).filter((v) => (typeof v === "boolean" ? v : String(v).trim() !== "")).length;

  /** Todas las filas del conjunto filtrado actual (sin paginar), para exportar. */
  const fetchAllRows = useCallback(async (): Promise<ProjectHistoryRow[]> => {
    const data = await apiFetch<{ items: ProjectHistoryRow[] }>(`/project-history/export?${filterParams(effective).toString()}`, { token: authToken });
    return data.items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, JSON.stringify(effective)]);

  return {
    data: query.data,
    isLoading: query.isPending && !invalidRange,
    isFetching: query.isFetching,
    isError: query.isError,
    invalidRange,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    filters,
    updateFilter,
    clearFilters,
    activeFilterCount,
    page,
    goToPage: (target: number) => setPage(Math.max(1, Math.min(target, query.data?.lastPage ?? 1))),
    fetchAllRows,
  };
}

export function useProjectHistoryDetail(authToken: string, projectId: string | null) {
  return useQuery({
    queryKey: ["projectHistoryDetail", authToken, projectId],
    queryFn: () => apiFetch<ProjectHistoryDetail>(`/project-history/${projectId}`, { token: authToken }),
    enabled: !!authToken && !!projectId,
    retry: false,
  });
}
