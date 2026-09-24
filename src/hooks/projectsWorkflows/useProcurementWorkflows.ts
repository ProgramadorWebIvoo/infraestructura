/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows de Procura y Analistas: aprobación de inversión, selección de
 * contratista, cuadro comparativo, propuestas (agregar/renegociar/invitar/
 * eliminar) e importación de propuestas del portal de proveedores.
 * Extraído de useProjectsWorkflows.ts (antes 795 líneas / 22 handlers en un
 * solo archivo — ver graphify toxic hotspot).
 */

import { useCallback } from "react";
import type { Project, Proposal } from "@/types";
import { ProjectStatus } from "@/types";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { WorkflowContext } from "./shared";

export function useProcurementWorkflows({
  authTokenRef,
  showToastRef,
  syncProjectRef,
  refreshAuditLogsRef,
  optimisticUpdate,
}: WorkflowContext) {
  const handleApproveInvestment = useCallback(
    async (projectId: string, notes: string, approvedAmount: number) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, {
        status: ProjectStatus.CONFIRMADO_PROCURA,
        procuraReviewNotes: notes,
        approvedInvestmentAmount: approvedAmount,
      });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/approve-investment`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes, approvedInvestmentAmount: approvedAmount }),
        });
        sync(project);
      } catch (error) {
        logError("handleApproveInvestment", error);
        if (previous) sync(previous);
        show("No se pudo aprobar la inversión.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  // Sin actualización optimista a propósito: el proyecto NO cambia de
  // status acá (solo queda "adjudicado" dentro del mismo COMPARATIVA_ENVIADA
  // hasta que se envía la comparativa), y el caller (AnalistasWorkspace)
  // depende de que el error se propague (throw) para no cerrar su modal —
  // aplicar y revertir un optimista sin cambio de status visible no
  // resolvería ningún parpadeo real.
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
    [authTokenRef, syncProjectRef],
  );

  // Sin optimista: el error se propaga para que la UI conserve su modal/selección.
  const handleApproveAward = useCallback(
    async (projectIds: string[], observations?: string) => {
      const token = authTokenRef.current;
      const sync = syncProjectRef.current;
      try {
        if (projectIds.length === 1) {
          const project = await apiFetch<Project>(`/projects/${projectIds[0]}/award-approval`, {
            method: "POST",
            token,
            body: JSON.stringify({ observations }),
          });
          sync(project);
        } else {
          const projects = await apiFetch<Project[]>("/projects/award-approvals/batch", {
            method: "POST",
            token,
            body: JSON.stringify({ projectIds, observations }),
          });
          projects.forEach(sync);
        }
      } catch (error) {
        logError("handleApproveAward", error);
        throw error;
      }
    },
    [authTokenRef, syncProjectRef],
  );

  const handleRejectAward = useCallback(
    async (projectId: string, reason: string, observations?: string) => {
      const token = authTokenRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/award-rejection`, {
          method: "POST",
          token,
          body: JSON.stringify({ reason, observations }),
        });
        sync(project);
      } catch (error) {
        logError("handleRejectAward", error);
        throw error;
      }
    },
    [authTokenRef, syncProjectRef],
  );

  const handleSendToFinance = useCallback(
    async (projectId: string) => {
      const token = authTokenRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/send-to-finance`, { method: "POST", token });
        sync(project);
      } catch (error) {
        logError("handleSendToFinance", error);
        throw error;
      }
    },
    [authTokenRef, syncProjectRef],
  );

  const handleRejectProposals = useCallback(
    async (projectId: string, reason: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, { status: ProjectStatus.CONFIRMADO_PROCURA });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/reject-proposals`, {
          method: "POST",
          token,
          body: JSON.stringify({ reason }),
        });
        sync(project);
      } catch (error) {
        logError("handleRejectProposals", error);
        if (previous) sync(previous);
        show("No se pudo rechazar el cuadro comparativo.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

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
    [authTokenRef, showToastRef, syncProjectRef],
  );

  const handleRenegotiateProposal = useCallback(
    async (projectId: string, proposalId: string, renegotiation: Omit<Proposal, "id" | "contractorCode" | "contractorName" | "contractorRating" | "origen" | "precioAnterior" | "precioNuevo" | "diferencia">) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/proposals/${proposalId}/renegotiate`, {
          method: "POST",
          token,
          body: JSON.stringify(renegotiation),
        });
        sync(project);
      } catch (error) {
        logError("handleRenegotiateProposal", error);
        show("No se pudo renegociar la propuesta.", "error");
        throw error;
      }
    },
    [authTokenRef, showToastRef, syncProjectRef],
  );

  const handleSendRenegotiationInvite = useCallback(
    async (projectId: string, proposalId: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      try {
        const result = await apiFetch<{ url: string; mailSent: boolean }>(
          `/projects/${projectId}/proposals/${proposalId}/renegotiation-invite`,
          { method: "POST", token },
        );
        if (result.mailSent) {
          show("Enlace de renegociación enviado al proveedor por correo.", "success");
        } else {
          // El correo no salió (ej. mailer sin configurar aún) — el enlace ya
          // quedó generado igual, así que se copia al portapapeles como
          // respaldo para que el analista pueda compartirlo manualmente.
          try {
            await navigator.clipboard.writeText(result.url);
            show("No se pudo enviar el correo (revise la configuración de mailer). Enlace copiado al portapapeles.", "warning");
          } catch {
            show(`No se pudo enviar el correo. Enlace: ${result.url}`, "warning");
          }
        }
      } catch (error) {
        logError("handleSendRenegotiationInvite", error);
        show("No se pudo generar el enlace de renegociación.", "error");
        throw error;
      }
    },
    [authTokenRef, showToastRef],
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
    [authTokenRef, showToastRef, syncProjectRef],
  );

  const handleSubmitComparative = useCallback(
    async (projectId: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, { status: ProjectStatus.COMPARATIVA_ENVIADA });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/submit-comparative`, {
          method: "POST",
          token,
        });
        sync(project);
      } catch (error) {
        logError("handleSubmitComparative", error);
        if (previous) sync(previous);
        show("No se pudo enviar el cuadro comparativo.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
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
    [authTokenRef, syncProjectRef, refreshAuditLogsRef],
  );

  return {
    handleApproveInvestment,
    handleSelectContractor,
    handleApproveAward,
    handleRejectAward,
    handleSendToFinance,
    handleRejectProposals,
    handleAddProposal,
    handleRenegotiateProposal,
    handleSendRenegotiationInvite,
    handleRemoveProposal,
    handleSubmitComparative,
    handleImportSupplierProposals,
  };
}
