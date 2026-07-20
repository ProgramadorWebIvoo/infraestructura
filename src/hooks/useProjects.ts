/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook facade de proyectos. Compone useProjectsData (fetch) y
 * useProjectsWorkflows (handlers). Ya NO carga contratistas/materiales
 * para otros hooks (acoplamiento eliminado); cada dominio fetchea lo suyo.
 */

import { useState, useCallback } from "react";
import type { Project, AuditLog } from "../types";
import { apiFetch } from "../services/api";
import { useProjectsData } from "./useProjectsData";
import { useProjectsWorkflows } from "./useProjectsWorkflows";

export type ShowToast = (msg: string, type?: "success" | "error" | "warning" | "info") => void;

export function useProjects(authToken: string, showToast: ShowToast) {
  const { projects, setProjects, auditLogs, setAuditLogs, isLoading, loadProjects } =
    useProjectsData({ authToken, showToast });

  const [inspectedProject, setInspectedProject] = useState<Project | null>(null);

  // Sync tras mutación: reemplaza el proyecto y refresca audit logs
  const refreshAuditLogs = useCallback(async () => {
    try {
      const audit = await apiFetch<AuditLog[]>("/audit-logs", { token: authToken });
      setAuditLogs(() => audit);
    } catch {
      // silent fail on poll
    }
  }, [authToken, setAuditLogs]);

  const syncProject = useCallback((project: Project) => {
    setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
    setInspectedProject(prev => prev?.id === project.id ? project : prev);
    refreshAuditLogs();
  }, [setProjects, setInspectedProject, refreshAuditLogs]);

  const getProject = useCallback((id: string) => projects.find(p => p.id === id), [projects]);

  const workflows = useProjectsWorkflows({
    authToken,
    showToast,
    syncProject,
    refreshAuditLogs,
    getProject,
  });

  const resetData = useCallback(() => {
    setProjects([]);
    setAuditLogs([]);
    setInspectedProject(null);
  }, [setProjects, setAuditLogs, setInspectedProject]);

  return {
    // Estado
    projects,
    auditLogs,
    isLoadingApi: isLoading,
    inspectedProject,
    setInspectedProject,
    refreshAuditLogs,
    loadApiData: loadProjects,

    // Workflows
    ...workflows,

    // Utilidades
    resetData,
  };
}
