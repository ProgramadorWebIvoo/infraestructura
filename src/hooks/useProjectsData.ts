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
import { logError } from "../services/logger";
import { INITIAL_PROJECTS, INITIAL_AUDIT_LOGS } from "../data";
import type { ShowToast } from "./useProjects";
import { usePolling } from "./usePolling";

type SignatureFn = (projects: Project[], audit: AuditLog[]) => string;

const defaultSignatureOf: SignatureFn = (projects, audit) =>
  projects
    .map(p => [p.id, p.status, p.proposals?.length ?? 0, p.advancePaidAmount ?? "", p.finalPaidAmount ?? "", p.qualityVerified ?? ""].join(":"))
    .join("|") +
  "#" +
  audit.map(a => a.id).join("|");

interface UseProjectsDataOptions {
  authToken: string;
  showToast: ShowToast;
  /** Custom signature function for polling deduplication. Defaults to id/status/proposals/amounts. */
  signatureFn?: SignatureFn;
}

export function useProjectsData({ authToken, showToast, signatureFn }: UseProjectsDataOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const signatureOf = signatureFn ?? defaultSignatureOf;
  const lastSig = useRef("");
  const prevToken = useRef(authToken);
  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  // Lee authToken/showToast desde refs para evitar race conditions si cambian durante un fetch
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const loadProjects = useCallback(async (opts?: { isPoll?: boolean }) => {
    const token = authTokenRef.current;
    if (!token) {
      return; // sin token no hay fetch, pero NO se baja isLoading para que al llegar el token se muestre skeleton
    }
    try {
      const [projectsData, audit] = await Promise.all([
        apiFetch<Project[]>("/projects", { token }),
        apiFetch<AuditLog[]>("/audit-logs", { token }),
      ]);
      const sig = signatureOf(projectsData, audit);
      if (opts?.isPoll && sig === lastSig.current) return; // dedupe: evita re-render cada tick
      lastSig.current = sig;
      setProjects(projectsData);
      setAuditLogs(audit);
    } catch (error) {
      if (opts?.isPoll) return; // silencioso en poll
      logError("useProjectsData", error);
      setProjects(INITIAL_PROJECTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      showToastRef.current("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
    } finally {
      if (!opts?.isPoll) setIsLoading(false);
    }
  }, []); // sin dependencias — todo vía refs para evitar recreación y race conditions

  // Resetear loading + disparar fetch cuando el token pasa de falsy → truthy (login)
  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
      loadProjects();
    }
    prevToken.current = authToken;
  }, [authToken, loadProjects]);

  // Carga inicial
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
