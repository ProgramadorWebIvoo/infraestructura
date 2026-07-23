/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows de proyectos agrupados por dominio de negocio.
 * Todos los handlers mutan via apiFetch y luego syncProject().
 */

import { useCallback, useRef } from "react";
import type { Project, Proposal } from "../types";
import { ProjectStatus } from "../types";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";
import type { ShowToast } from "./useProjects";

interface UseProjectsWorkflowsOptions {
  authToken: string;
  showToast: ShowToast;
  syncProject: (project: Project) => void;
  refreshAuditLogs: () => Promise<void>;
  getProject: (id: string) => Project | undefined;
}

/**
 * Workflows de proyectos agrupados por dominio de negocio.
 *
 * Cada handler muta el backend via apiFetch con el token desde una ref,
 * para evitar race conditions si el token se refresca (X-Refresh-Token)
 * mientras una mutación está en curso.
 *
 * IMPORTANTE: Todos los handlers usan la respuesta del backend (Project)
 * para syncProject, garantizando que el estado local refleja el servidor.
 */
export function useProjectsWorkflows(options: UseProjectsWorkflowsOptions) {
  // Refs para evitar race conditions por cambio de token/showToast durante fetch
  const authTokenRef = useRef(options.authToken);
  authTokenRef.current = options.authToken;
  const showToastRef = useRef(options.showToast);
  showToastRef.current = options.showToast;
  const syncProjectRef = useRef(options.syncProject);
  syncProjectRef.current = options.syncProject;
  const refreshAuditLogsRef = useRef(options.refreshAuditLogs);
  refreshAuditLogsRef.current = options.refreshAuditLogs;
  const getProjectRef = useRef(options.getProject);
  getProjectRef.current = options.getProject;

  // ── Infraestructura / Mantenimiento ───────────────────────────────
  const handleAddProject = useCallback(
    async (newProj: Omit<Project, "id" | "createdDate" | "status">) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>("/projects", {
          method: "POST",
          token,
          body: JSON.stringify(newProj),
        });
        sync(project);
      } catch (error) {
        logError("handleAddProject", error);
        show("No se pudo registrar la obra en Laravel.", "error");
      }
    },
    [], // sin dependencias — todo vía refs
  );

  const handleReviewProject = useCallback(
    async (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/review`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes, blueprintsCount: planFiles.length, calculationsAdded: calcFiles.length > 0 }),
        });
        sync(project);

        const uploadGroup = async (files: File[], type: "PLANO" | "CALC") => {
          if (files.length === 0) return;
          const form = new FormData();
          form.append("document_type", type);
          files.forEach(f => form.append("files[]", f));
          await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });
        };

        await Promise.all([uploadGroup(planFiles, "PLANO"), uploadGroup(calcFiles, "CALC")]);
        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(refreshed);
      } catch (error) {
        logError("handleReviewProject", error);
        show("No se pudo guardar la revisión técnica.", "error");
      }
    },
    [],
  );

  // ── Procura ─────────────────────────────────────────────────────────
  const handleApproveInvestment = useCallback(
    async (projectId: string, notes: string, approvedAmount: number) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/approve-investment`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes, approvedInvestmentAmount: approvedAmount }),
        });
        sync(project);
      } catch (error) {
        logError("handleApproveInvestment", error);
        show("No se pudo aprobar la inversión.", "error");
      }
    },
    [],
  );

  const handleSelectContractor = useCallback(
    async (projectId: string, contractorCode: string, proposalId: string) => {
      const token = authTokenRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/select-contractor`, {
          method: "POST",
          token,
          body: JSON.stringify({ contractorCode, proposalId }),
        });
        sync(project);
      } catch (error) {
        logError("handleSelectContractor", error);
        throw error;
      }
    },
    [],
  );

  const handleRejectProposals = useCallback(
    async (projectId: string, reason: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/reject-proposals`, {
          method: "POST",
          token,
          body: JSON.stringify({ reason }),
        });
        sync(project);
      } catch (error) {
        logError("handleRejectProposals", error);
        show("No se pudo rechazar el cuadro comparativo.", "error");
      }
    },
    [],
  );

  // ── Analistas ──────────────────────────────────────────────────────
  const handleAddProposal = useCallback(
    async (projectId: string, proposal: Omit<Proposal, "id">) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/proposals`, {
          method: "POST",
          token,
          body: JSON.stringify(proposal),
        });
        sync(project);
      } catch (error) {
        logError("handleAddProposal", error);
        show("No se pudo cargar la propuesta.", "error");
      }
    },
    [],
  );

  const handleRemoveProposal = useCallback(
    async (projectId: string, proposalId: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/proposals/${proposalId}`, {
          method: "DELETE",
          token,
        });
        sync(project);
      } catch (error) {
        logError("handleRemoveProposal", error);
        show("No se pudo eliminar la propuesta.", "error");
      }
    },
    [],
  );

  const handleSubmitComparative = useCallback(
    async (projectId: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/submit-comparative`, {
          method: "POST",
          token,
        });
        sync(project);
      } catch (error) {
        logError("handleSubmitComparative", error);
        show("No se pudo enviar el cuadro comparativo.", "error");
      }
    },
    [],
  );

  const handleImportSupplierProposals = useCallback(
    async (projectId: string): Promise<{ message: string; imported: number; skipped: number }> => {
      const token = authTokenRef.current;
      const sync = syncProjectRef.current;
      const refreshAudit = refreshAuditLogsRef.current;
      const json = await apiFetch<{
        message: string;
        imported: number;
        skipped: number;
        project?: { data?: Project } | Project;
      }>(`/projects/${projectId}/import-supplier-proposals`, {
        method: "POST",
        token,
      });

      if (json.project) {
        const project = (json.project as { data?: Project }).data ?? (json.project as Project);
        sync(project);
      }
      await refreshAudit();

      return { message: json.message, imported: json.imported ?? 0, skipped: json.skipped ?? 0 };
    },
    [],
  );

  // ── Finanzas ──────────────────────────────────────────────────────
  const handlePayAdvance = useCallback(
    async (projectId: string, amount: number) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
          method: "POST",
          token,
          body: JSON.stringify({ paymentType: "ADVANCE", amount }),
        });
        sync(project);
      } catch (error) {
        logError("handlePayAdvance", error);
        show("No se pudo registrar el anticipo.", "error");
      }
    },
    [],
  );

  const handlePayFinal = useCallback(
    async (projectId: string, amount: number) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
          method: "POST",
          token,
          body: JSON.stringify({ paymentType: "FINAL", amount }),
        });
        sync(project);
      } catch (error) {
        logError("handlePayFinal", error);
        show("No se pudo registrar el pago final.", "error");
      }
    },
    [],
  );

  // ── Cierre de Obra ───────────────────────────────────────────────
  const handleVerifyCompletion = useCallback(
    async (projectId: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const get = getProjectRef.current;
      const project = get(projectId);
      const isStartingVerification = project?.status === ProjectStatus.EN_EJECUCION;

      try {
        const updated = await apiFetch<Project>(
          `/projects/${projectId}/${isStartingVerification ? "report-finished" : "verify-completion"}`,
          {
            method: "POST",
            token,
            body: isStartingVerification ? undefined : JSON.stringify({ qualityVerified: true }),
          },
        );
        sync(updated);
      } catch (error) {
        logError("handleVerifyCompletion", error);
        show("No se pudo actualizar la verificación de cierre.", "error");
      }
    },
    [],
  );

  return {
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
  };
}
