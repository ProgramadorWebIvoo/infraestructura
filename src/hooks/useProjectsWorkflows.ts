/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows de proyectos agrupados por dominio de negocio.
 * Todos los handlers mutan via apiFetch y luego syncProject().
 */

import { useCallback } from "react";
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

export function useProjectsWorkflows({
  authToken,
  showToast,
  syncProject,
  refreshAuditLogs,
  getProject,
}: UseProjectsWorkflowsOptions) {

  // ── Infraestructura / Mantenimiento ───────────────────────────────
  const handleAddProject = useCallback(
    async (newProj: Omit<Project, "id" | "createdDate" | "status">) => {
      try {
        const project = await apiFetch<Project>("/projects", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(newProj),
        });
        syncProject(project);
      } catch (error) {
        logError("handleAddProject", error);
        showToast("No se pudo registrar la obra en Laravel.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  const handleReviewProject = useCallback(
    async (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => {
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
          await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token: authToken, body: form });
        };

        await Promise.all([uploadGroup(planFiles, "PLANO"), uploadGroup(calcFiles, "CALC")]);
        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token: authToken });
        syncProject(refreshed);
      } catch (error) {
        logError("handleReviewProject", error);
        showToast("No se pudo guardar la revisión técnica.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  // ── Procura ─────────────────────────────────────────────────────────
  const handleApproveInvestment = useCallback(
    async (projectId: string, notes: string, approvedAmount: number) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/approve-investment`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ notes, approvedInvestmentAmount: approvedAmount }),
        });
        syncProject(project);
      } catch (error) {
        logError("handleApproveInvestment", error);
        showToast("No se pudo aprobar la inversión.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  const handleSelectContractor = useCallback(
    async (projectId: string, contractorCode: string, proposalId: string) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/select-contractor`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ contractorCode, proposalId }),
        });
        syncProject(project);
      } catch (error) {
        logError("handleSelectContractor", error);
        throw error;
      }
    },
    [authToken, syncProject],
  );

  const handleRejectProposals = useCallback(
    async (projectId: string, reason: string) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/reject-proposals`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ reason }),
        });
        syncProject(project);
      } catch (error) {
        logError("handleRejectProposals", error);
        showToast("No se pudo rechazar el cuadro comparativo.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  // ── Analistas ──────────────────────────────────────────────────────
  const handleAddProposal = useCallback(
    async (projectId: string, proposal: Omit<Proposal, "id">) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/proposals`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify(proposal),
        });
        syncProject(project);
      } catch (error) {
        logError("handleAddProposal", error);
        showToast("No se pudo cargar la propuesta.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  const handleRemoveProposal = useCallback(
    async (projectId: string, proposalId: string) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/proposals/${proposalId}`, {
          method: "DELETE",
          token: authToken,
        });
        syncProject(project);
      } catch (error) {
        logError("handleRemoveProposal", error);
        showToast("No se pudo eliminar la propuesta.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  const handleSubmitComparative = useCallback(
    async (projectId: string) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/submit-comparative`, {
          method: "POST",
          token: authToken,
        });
        syncProject(project);
      } catch (error) {
        logError("handleSubmitComparative", error);
        showToast("No se pudo enviar el cuadro comparativo.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  const handleImportSupplierProposals = useCallback(
    async (projectId: string): Promise<{ message: string; imported: number; skipped: number }> => {
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
        syncProject(project);
      }
      await refreshAuditLogs();

      return { message: json.message, imported: json.imported ?? 0, skipped: json.skipped ?? 0 };
    },
    [authToken, syncProject, refreshAuditLogs],
  );

  // ── Finanzas ──────────────────────────────────────────────────────
  const handlePayAdvance = useCallback(
    async (projectId: string, amount: number) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ paymentType: "ADVANCE", amount }),
        });
        syncProject(project);
      } catch (error) {
        logError("handlePayAdvance", error);
        showToast("No se pudo registrar el anticipo.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  const handlePayFinal = useCallback(
    async (projectId: string, amount: number) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ paymentType: "FINAL", amount }),
        });
        syncProject(project);
      } catch (error) {
        logError("handlePayFinal", error);
        showToast("No se pudo registrar el pago final.", "error");
      }
    },
    [authToken, showToast, syncProject],
  );

  // ── Cierre de Obra ───────────────────────────────────────────────
  const handleVerifyCompletion = useCallback(
    async (projectId: string) => {
      const project = getProject(projectId);
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
        logError("handleVerifyCompletion", error);
        showToast("No se pudo actualizar la verificación de cierre.", "error");
      }
    },
    [authToken, showToast, syncProject, getProject],
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
