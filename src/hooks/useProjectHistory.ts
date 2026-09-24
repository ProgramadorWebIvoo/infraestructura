/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico de Obras (Presidencia): listado paginado con filtros server-side
 * y detalle de una obra. Sin polling: es una vista de consulta histórica, se
 * refresca a demanda.
 */

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { useDebounce } from "./useDebounce";
import type {
  ProjectHistoryDetail,
  ProjectHistoryListFilters,
  ProjectHistoryPage,
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

function toQuery(filters: ProjectHistoryListFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.withAlerts) params.set("withAlerts", "1");
  return params.toString();
}

export function useProjectHistoryList(authToken: string) {
  const [filters, setFilters] = useState<ProjectHistoryListFilters>(EMPTY_HISTORY_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(filters.q, 350);
  const effective = { ...filters, q: debouncedQuery };

  const query = useQuery({
    queryKey: ["projectHistory", authToken, effective, page],
    queryFn: () => apiFetch<ProjectHistoryPage>(`/project-history?${toQuery(effective, page)}`, { token: authToken }),
    enabled: !!authToken,
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
    Object.entries(filters).filter(([, v]) => (typeof v === "boolean" ? v : String(v).trim() !== "")).length;

  return {
    data: query.data,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    filters,
    updateFilter,
    clearFilters,
    activeFilterCount,
    page,
    goToPage: (target: number) => setPage(Math.max(1, Math.min(target, query.data?.lastPage ?? 1))),
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
