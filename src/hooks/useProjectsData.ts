/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fetch de proyectos y logs de auditoría desde la API Laravel.
 * Extraído de useProjects para separar data-fetching de workflows.
 *
 * Migrado de polling manual (usePolling + useState) a TanStack Query:
 * caché por queryKey ([projects, token] / [auditLogs, token]) compartida
 * si en el futuro más de un componente usa este hook a la vez, en vez de
 * cada instancia abriendo su propio timer duplicado. La firma pública
 * (projects, setProjects, auditLogs, setAuditLogs, isLoading, loadProjects)
 * se mantiene igual para no tocar los consumidores (useProjects.ts).
 */

import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, AuditLog } from "@/types";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import { INITIAL_PROJECTS, INITIAL_AUDIT_LOGS } from "@/data";
import type { ShowToast } from "./useProjects";

const POLL_MS = 25000;

function projectsKey(authToken: string) {
  return ["projects", authToken] as const;
}
function auditLogsKey(authToken: string) {
  return ["auditLogs", authToken] as const;
}

type ArrayUpdater<T> = T[] | ((prev: T[]) => T[]);

interface UseProjectsDataOptions {
  authToken: string;
  showToast: ShowToast;
}

export function useProjectsData({ authToken, showToast }: UseProjectsDataOptions) {
  const queryClient = useQueryClient();
  const enabled = !!authToken;

  // Lee showToast desde ref para evitar recrear callbacks si cambia entre renders
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const projectsQuery = useQuery({
    queryKey: projectsKey(authToken),
    queryFn: () => apiFetch<Project[]>("/projects", { token: authToken }),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    staleTime: POLL_MS - 5000,
    retry: false,
  });

  const auditLogsQuery = useQuery({
    queryKey: auditLogsKey(authToken),
    queryFn: () => apiFetch<AuditLog[]>("/audit-logs", { token: authToken }),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    staleTime: POLL_MS - 5000,
    retry: false,
  });

  const projects = projectsQuery.data ?? [];
  const auditLogs = auditLogsQuery.data ?? [];
  // isPending (sin data aún) en vez de isFetching: replica isLoading=true
  // mientras no hay token (fetch deshabilitado) hasta el primer fetch real.
  const isLoading = projectsQuery.isPending || auditLogsQuery.isPending;

  // Fallback dev + toast solo en el fetch inicial sin data todavía — una vez
  // que hay data en caché (éxito o fallback), un fallo de poll en background
  // no vuelve a dejar la query en estado "error sin data", así que este
  // efecto no se re-dispara en cada tick fallido (silencioso en poll, igual
  // que el comportamiento original).
  useEffect(() => {
    if (!enabled) return;
    if (!projectsQuery.isError && !auditLogsQuery.isError) return;
    const error = projectsQuery.error ?? auditLogsQuery.error;
    logError("useProjectsData", error);
    if (import.meta.env.DEV) {
      queryClient.setQueryData(projectsKey(authToken), INITIAL_PROJECTS);
      queryClient.setQueryData(auditLogsKey(authToken), INITIAL_AUDIT_LOGS);
      showToastRef.current("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
    } else {
      queryClient.setQueryData(projectsKey(authToken), []);
      queryClient.setQueryData(auditLogsKey(authToken), []);
      showToastRef.current("No se pudo conectar con el servidor. Intenta nuevamente en unos minutos.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsQuery.isError, auditLogsQuery.isError, enabled, authToken]);

  const setProjects = useCallback((updater: ArrayUpdater<Project>) => {
    queryClient.setQueryData<Project[]>(projectsKey(authToken), (prev = []) =>
      typeof updater === "function" ? updater(prev) : updater);
  }, [authToken, queryClient]);

  const setAuditLogs = useCallback((updater: ArrayUpdater<AuditLog>) => {
    queryClient.setQueryData<AuditLog[]>(auditLogsKey(authToken), (prev = []) =>
      typeof updater === "function" ? updater(prev) : updater);
  }, [authToken, queryClient]);

  const loadProjects = useCallback(async () => {
    if (!authToken) return;
    await Promise.all([projectsQuery.refetch(), auditLogsQuery.refetch()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, projectsQuery.refetch, auditLogsQuery.refetch]);

  return {
    projects,
    setProjects,
    auditLogs,
    setAuditLogs,
    isLoading,
    loadProjects,
  };
}
