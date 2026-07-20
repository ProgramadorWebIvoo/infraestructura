/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook que gestiona el estado global de proyectos, auditoría y todas
 * las acciones del workflow (crear, revisar, aprobar, licitar, pagar, etc.).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { Project, AuditLog, Proposal } from "../types";
import { ProjectStatus } from "../types";
import {
  INITIAL_PROJECTS,
  INITIAL_AUDIT_LOGS,
} from "../data";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseProjectsOptions {
  /** Callback cuando se cargan contratistas desde la API (para poblar useContractors) */
  onContractorsLoaded?: (contractors: { code: string; name: string; specialty: string; rating: number; contact: string }[]) => void;
  /** Callback cuando se cargan materiales desde la API (para poblar useCatalog) */
  onMaterialsLoaded?: (materials: { name: string; unit: string; estimatedUnitPrice: number }[]) => void;
}

export function useProjects(
  authToken: string,
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void,
  options?: UseProjectsOptions,
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const isFetchingRef = useRef(false);

  // Inspect modal state
  const [inspectedProject, setInspectedProject] = useState<Project | null>(null);

  // -----------------------------------------------------------------------
  // Carga inicial
  // -----------------------------------------------------------------------

  const loadApiData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [projects, audit, contractors, materials] = await Promise.all([
        apiFetch<Project[]>("/projects", { token: authToken }),
        apiFetch<AuditLog[]>("/audit-logs", { token: authToken }),
        // contractors y materials se cargan aquí pero los gestionan otros hooks;
        // estos sets se mantienen para compatibilidad con loadApiData original
        apiFetch<{ code: string; name: string; specialty: string; rating: number; contact: string }[]>("/contractors", { token: authToken }),
        apiFetch<{ name: string; unit: string; estimatedUnitPrice: number }[]>("/materials", { token: authToken }),
      ]);

      setProjects(projects);
      setAuditLogs(audit);

      // Poblar hooks hermanos si hay callbacks
      options?.onContractorsLoaded?.(contractors);
      options?.onMaterialsLoaded?.(materials);
    } catch (error) {
      console.error(error);
      setProjects(INITIAL_PROJECTS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      showToast("No se pudo conectar con la API. Cargando datos locales de respaldo.", "warning");
    } finally {
      isFetchingRef.current = false;
      setIsLoadingApi(false);
    }
  }, [authToken, showToast]);

  // Efecto de carga inicial
  useEffect(() => {
    if (!authToken) {
      setIsLoadingApi(false);
      return;
    }
    loadApiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // -----------------------------------------------------------------------
  // Sincronización
  // -----------------------------------------------------------------------

  const refreshAuditLogs = useCallback(async () => {
    try {
      const audit = await apiFetch<AuditLog[]>("/audit-logs", { token: authToken });
      setAuditLogs(audit);
    } catch {
      // silent fail on poll
    }
  }, [authToken]);

  const syncProject = useCallback((project: Project) => {
    setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
    setInspectedProject(prev => prev?.id === project.id ? project : prev);
    refreshAuditLogs();
  }, [refreshAuditLogs]);

  // -----------------------------------------------------------------------
  // Handlers del workflow
  // -----------------------------------------------------------------------

  // 1. Infraestructura / Mantenimiento
  const handleAddProject = useCallback(async (newProj: Omit<Project, "id" | "createdDate" | "status">) => {
    try {
      const project = await apiFetch<Project>("/projects", {
        method: "POST",
        token: authToken,
        body: JSON.stringify(newProj),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar la obra en Laravel.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 2. Cierre de Obra
  const handleReviewProject = useCallback(async (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/review`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ notes, blueprintsCount: planFiles.length, calculationsAdded: calcFiles.length > 0 }),
      });
      syncProject(project);

      const uploadGroup = async (files: File[], type: "PLANO" | "CALC") => {
        if (files.length === 0) return;
        const form = new FormData();
        form.append("document_type", type);
        files.forEach(f => form.append("files[]", f));
        await apiFetch(`/projects/${projectId}/documents`, {
          method: "POST",
          token: authToken,
          body: form,
        });
      };

      await Promise.all([uploadGroup(planFiles, "PLANO"), uploadGroup(calcFiles, "CALC")]);

      const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token: authToken });
      setProjects(prev => [refreshed, ...prev.filter(item => item.id !== refreshed.id)]);
    } catch (error) {
      console.error(error);
      showToast("No se pudo guardar la revisión técnica.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 3. Procura — aprobar inversión
  const handleApproveInvestment = useCallback(async (projectId: string, notes: string, approvedAmount: number) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/approve-investment`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ notes, approvedInvestmentAmount: approvedAmount }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo aprobar la inversión.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 4. Analistas — propuestas
  const handleAddProposal = useCallback(async (projectId: string, proposal: Omit<Proposal, "id">) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/proposals`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify(proposal),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo cargar la propuesta.", "error");
    }
  }, [authToken, showToast, syncProject]);

  const handleRemoveProposal = useCallback(async (projectId: string, proposalId: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/proposals/${proposalId}`, {
        method: "DELETE",
        token: authToken,
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo eliminar la propuesta.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 4b. Importar propuestas del portal público
  const handleImportSupplierProposals = useCallback(async (projectId: string): Promise<{ message: string; imported: number; skipped: number }> => {
    const json = await apiFetch<{
      message: string;
      imported: number;
      skipped: number;
      project?: { data?: Project } | Project;
    }>(`/projects/${projectId}/import-supplier-proposals`, {
      method: "POST",
      token: authToken,
    });

    if (json.project) {
      const project = (json.project as { data?: Project }).data ?? (json.project as Project);
      setProjects(prev => [project, ...prev.filter(item => item.id !== project.id)]);
      setInspectedProject(prev => prev?.id === project.id ? project : prev);
    }

    await refreshAuditLogs();

    return {
      message: json.message,
      imported: json.imported ?? 0,
      skipped: json.skipped ?? 0,
    };
  }, [authToken, refreshAuditLogs]);

  // 5. Analistas — enviar cuadro comparativo
  const handleSubmitComparative = useCallback(async (projectId: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/submit-comparative`, {
        method: "POST",
        token: authToken,
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo enviar el cuadro comparativo.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 6. Procura — adjudicar contratista
  const handleSelectContractor = useCallback(async (projectId: string, contractorCode: string, proposalId: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/select-contractor`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ contractorCode, proposalId }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      throw error; // propagar para feedback en el modal
    }
  }, [authToken, syncProject]);

  // 7. Procura — rechazar propuestas
  const handleRejectProposals = useCallback(async (projectId: string, reason: string) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/reject-proposals`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ reason }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo rechazar el cuadro comparativo.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 8. Finanzas — pago de anticipo
  const handlePayAdvance = useCallback(async (projectId: string, amount: number) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ paymentType: "ADVANCE", amount }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar el anticipo.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // 9. Cierre de Obra — verificar finalización
  const handleVerifyCompletion = useCallback(async (projectId: string) => {
    const project = projects.find(item => item.id === projectId);
    const isStartingVerification = project?.status === ProjectStatus.EN_EJECUCION;

    try {
      const updated = await apiFetch<Project>(
        `/projects/${projectId}/${isStartingVerification ? "report-finished" : "verify-completion"}`,
        {
          method: "POST",
          token: authToken,
          body: isStartingVerification ? undefined : JSON.stringify({ qualityVerified: true }),
        },
      );
      syncProject(updated);
    } catch (error) {
      console.error(error);
      showToast("No se pudo actualizar la verificación de cierre.", "error");
    }
  }, [authToken, projects, showToast, syncProject]);

  // 10. Finanzas — pago final
  const handlePayFinal = useCallback(async (projectId: string, amount: number) => {
    try {
      const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ paymentType: "FINAL", amount }),
      });
      syncProject(project);
    } catch (error) {
      console.error(error);
      showToast("No se pudo registrar el pago final.", "error");
    }
  }, [authToken, showToast, syncProject]);

  // Limpiar datos (para logout)
  const resetData = useCallback(() => {
    setProjects([]);
    setAuditLogs([]);
    setIsLoadingApi(true);
    setInspectedProject(null);
    isFetchingRef.current = false;
  }, []);

  return {
    // Estado
    projects,
    auditLogs,
    isLoadingApi,
    inspectedProject,
    refreshAuditLogs,
    syncProject,
    loadApiData,

    // Setters públicos (para compatibilidad)
    setProjects,
    setAuditLogs,
    setInspectedProject,

    // Handlers del workflow
    handleAddProject,
    handleReviewProject,
    handleApproveInvestment,
    handleAddProposal,
    handleRemoveProposal,
    handleImportSupplierProposals,
    handleSubmitComparative,
    handleSelectContractor,
    handleRejectProposals,
    handlePayAdvance,
    handleVerifyCompletion,
    handlePayFinal,
    // Utilidades
    resetData,
  };
}
