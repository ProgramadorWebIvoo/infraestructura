/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fetch de proyectos y logs de auditoría desde la API Laravel.
 * Extraído de useProjects para separar data-fetching de workflows.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, AuditLog } from "../types";
import { apiFetch } from "../services/api";
import { INITIAL_PROJECTS, INITIAL_AUDIT_LOGS } from "../data";
import type { ShowToast } from "./useProjects";
import { usePolling } from "./usePolling";

interface UseProjectsDataOptions {
  authToken: string;
  showToast: ShowToast;
}

export function useProjectsData({ authToken, showToast }: UseProjectsDataOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lastSig = useRef("");

  const signatureOf = (projects: Project[], audit: AuditLog[]) =>
    projects
      .map(p => [p.id, p.status, p.proposals?.length ?? 0, p.advancePaidAmount ?? "", p.finalPaidAmount ?? "", p.qualityVerified ?? ""].join(":"))
      .join("|") +
    "#" +
    audit.map(a => a.id).join("|");

  const loadProjects = useCallback(async (opts?: { isPoll?: boolean }) => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const [projectsData, audit] = await Promise.all([
        apiFetch<Project[]>("/projects", { token: authToken }),
        apiFetch<AuditLog[]>("/audit-logs", { token: authToken }),
      ]);
      const sig = signatureOf(projectsData, audit);
      if (opts?.isPoll && sig === lastSig.current) return; // dedupe: evita re-render cada tick
      lastSig.current = sig;
      setProjects(projectsData);
      setAuditLogs(audit);
    } catch (error) {
      if (opts?.isPoll) return; // silencioso en poll
      console.error(error);
      setProjects(INITIAL_PROJECTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      showToast("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
    } finally {
      if (!opts?.isPoll) setIsLoading(false);
    }
  }, [authToken, showToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Polling esencial: projects + auditLogs (mutados por otros roles/dispositivos)
  usePolling(
    useCallback(() => loadProjects({ isPoll: true }), [loadProjects]),
    25000,
    !!authToken
  );

  return {
    projects,
    setProjects,
    auditLogs,
    setAuditLogs,
    isLoading,
    loadProjects,
  };
}
