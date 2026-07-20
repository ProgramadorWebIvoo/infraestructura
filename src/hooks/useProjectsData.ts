/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fetch de proyectos y logs de auditoría desde la API Laravel.
 * Extraído de useProjects para separar data-fetching de workflows.
 */

import { useState, useEffect, useCallback } from "react";
import type { Project, AuditLog } from "../types";
import { apiFetch } from "../services/api";
import { INITIAL_PROJECTS, INITIAL_AUDIT_LOGS } from "../data";
import type { ShowToast } from "./useProjects";

interface UseProjectsDataOptions {
  authToken: string;
  showToast: ShowToast;
}

export function useProjectsData({ authToken, showToast }: UseProjectsDataOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const [projectsData, audit] = await Promise.all([
        apiFetch<Project[]>("/projects", { token: authToken }),
        apiFetch<AuditLog[]>("/audit-logs", { token: authToken }),
      ]);
      setProjects(projectsData);
      setAuditLogs(audit);
    } catch (error) {
      console.error(error);
      setProjects(INITIAL_PROJECTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      showToast("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    setProjects,
    auditLogs,
    setAuditLogs,
    isLoading,
    loadProjects,
  };
}
