/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows de proyectos agrupados por dominio de negocio.
 * Todos los handlers mutan via apiFetch y luego syncProject().
 */

import { useCallback, useRef } from "react";
import type { Project, ProjectDocument, Proposal } from "../types";
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
  /**
   * Orquesta 2 fases desde la perspectiva de la UX (un solo submit): (1)
   * crea el proyecto con datos+materiales vía JSON, (2) sube los grupos de
   * archivos no vacíos vía multipart reutilizando el endpoint de documentos
   * ya existente, (3) refresca el proyecto completo. El proyecto ya existe
   * tras (1) — no hay rollback si falla algún grupo de archivos; se reporta
   * como éxito parcial (warning), no como error total.
   */
  const handleAddProject = useCallback(
    async (
      newProj: Omit<Project, "id" | "createdDate" | "status">,
      files: { photos: File[]; documents: File[]; plans: File[] },
    ): Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }> => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      let project: Project;
      try {
        project = await apiFetch<Project>("/projects", {
          method: "POST",
          token,
          body: JSON.stringify(newProj),
        });
        sync(project);
      } catch (error) {
        logError("handleAddProject", error);
        show("No se pudo registrar la obra en Laravel.", "error");
        return { ok: false, partial: false, failedGroups: [] };
      }

      const uploadGroup = async (list: File[], type: "FOTO" | "CALC" | "PLANO", groupLabel: string) => {
        if (list.length === 0) return null;
        const form = new FormData();
        form.append("document_type", type);
        list.forEach(f => form.append("files[]", f));
        try {
          await apiFetch(`/projects/${project.id}/documents`, { method: "POST", token, body: form });
          return null;
        } catch (error) {
          logError(`handleAddProject:upload:${type}`, error);
          return groupLabel;
        }
      };

      const results = await Promise.all([
        uploadGroup(files.photos, "FOTO", "fotos"),
        uploadGroup(files.documents, "CALC", "documentos"),
        uploadGroup(files.plans, "PLANO", "planos"),
      ]);
      const failedGroups = results.filter((r): r is string => r !== null);

      try {
        const refreshed = await apiFetch<Project>(`/projects/${project.id}`, { token });
        sync(refreshed);
      } catch (error) {
        logError("handleAddProject:refresh", error);
      }

      if (failedGroups.length === 0) {
        show("Petición de Infraestructura registrada con éxito y enviada a Cierre de Obra.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      }

      show(
        `Petición registrada, pero no se pudieron adjuntar: ${failedGroups.join(", ")}.`,
        "warning",
      );
      return { ok: true, partial: true, failedGroups };
    },
    [], // sin dependencias — todo vía refs
  );

  /** Cierre de Obra audita la petición — no sube documentación propia, solo
   * confirma lo ya adjuntado por Infraestructura (ver TechnicalReviewSection). */
  const handleReviewProject = useCallback(
    async (projectId: string, notes: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/review`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes: notes.trim() || undefined }),
        });
        sync(project);
      } catch (error) {
        logError("handleReviewProject", error);
        show("No se pudo guardar la revisión técnica.", "error");
      }
    },
    [],
  );

  /** Rechaza la petición inicial (antes de revisión de planos) — distinto de
   * handleRejectProposals (Procura, rechaza el cuadro comparativo). Mismo
   * shape de dos fases que handleAddProject/handleResubmitProject cuando hay
   * correcciones que adjuntar (JSON de rechazo + upload multipart opcional
   * + refetch), para que sync() traiga los documentos CORRECCION nuevos. */
  const handleRejectProject = useCallback(
    async (
      projectId: string,
      reason: string,
      observations?: string,
      correctionFiles: File[] = [],
    ): Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }> => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/reject-project`, {
          method: "POST",
          token,
          body: JSON.stringify({ reason, observations: observations || undefined }),
        });
        sync(project);
      } catch (error) {
        logError("handleRejectProject", error);
        show("No se pudo rechazar la petición.", "error");
        return { ok: false, partial: false, failedGroups: [] };
      }

      if (correctionFiles.length === 0) {
        show("Petición rechazada correctamente.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      }

      try {
        const form = new FormData();
        form.append("document_type", "CORRECCION");
        correctionFiles.forEach(f => form.append("files[]", f));
        await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });

        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(refreshed);
        show("Petición rechazada y correcciones adjuntadas correctamente.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      } catch (error) {
        logError("handleRejectProject:uploadCorrections", error);
        show("Petición rechazada, pero no se pudieron adjuntar las correcciones.", "warning");
        return { ok: true, partial: true, failedGroups: ["correcciones"] };
      }
    },
    [],
  );

  /** Reenvía una petición previamente rechazada (mismo Project.id) con los campos
   * corregidos — mismo shape de dos fases que handleAddProject (JSON + upload de
   * adjuntos nuevos + refetch), pero contra /resubmit en vez de crear un proyecto.
   *
   * `existingDocuments` son los adjuntos vivos (no marcados para eliminar) que
   * el proyecto ya tenía antes de este reenvío. `versionReplacements` son
   * archivos elegidos EXPLÍCITAMENTE por el usuario (botón "Nueva versión" por
   * fila en AttachmentsSection) como reemplazo de un documento puntual — cada
   * uno sube con `new_version_of` fijo al id de esa fila, sin adivinar. Los 3
   * grupos de `files` (fotos/documentos/planos) son siempre archivos nuevos
   * sin vínculo, nunca versionan nada existente. */
  const handleResubmitProject = useCallback(
    async (
      projectId: string,
      updated: Omit<Project, "id" | "createdDate" | "status" | "type">,
      files: { photos: File[]; documents: File[]; plans: File[] },
      existingDocuments: ProjectDocument[] = [],
      versionReplacements: { documentId: number; documentType: ProjectDocument["documentType"]; file: File }[] = [],
    ): Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }> => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      let project: Project;
      try {
        project = await apiFetch<Project>(`/projects/${projectId}/resubmit`, {
          method: "POST",
          token,
          body: JSON.stringify(updated),
        });
        sync(project);
      } catch (error) {
        logError("handleResubmitProject", error);
        show("No se pudo reenviar la petición corregida.", "error");
        return { ok: false, partial: false, failedGroups: [] };
      }

      const uploadGroup = async (list: File[], type: "FOTO" | "CALC" | "PLANO", groupLabel: string) => {
        if (list.length === 0) return null;
        const form = new FormData();
        form.append("document_type", type);
        list.forEach(f => form.append("files[]", f));
        try {
          await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });
          return null;
        } catch (error) {
          logError(`handleResubmitProject:upload:${type}`, error);
          return groupLabel;
        }
      };

      const uploadReplacement = async (documentId: number, documentType: ProjectDocument["documentType"], file: File) => {
        const form = new FormData();
        form.append("document_type", documentType);
        form.append("new_version_of", String(documentId));
        form.append("files[]", file);
        try {
          await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });
          return null;
        } catch (error) {
          logError(`handleResubmitProject:uploadReplacement:${documentId}`, error);
          return `nueva versión de ${file.name}`;
        }
      };

      const results = await Promise.all([
        uploadGroup(files.photos, "FOTO", "fotos"),
        uploadGroup(files.documents, "CALC", "documentos"),
        uploadGroup(files.plans, "PLANO", "planos"),
        ...versionReplacements.map((r) => uploadReplacement(r.documentId, r.documentType, r.file)),
      ]);
      const failedGroups = results.filter((r): r is string => r !== null);

      try {
        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(refreshed);
      } catch (error) {
        logError("handleResubmitProject:refresh", error);
      }

      if (failedGroups.length === 0) {
        show("Petición corregida y reenviada a Cierre de Obra.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      }

      show(
        `Petición reenviada, pero no se pudieron adjuntar: ${failedGroups.join(", ")}.`,
        "warning",
      );
      return { ok: true, partial: true, failedGroups };
    },
    [],
  );

  /** Elimina un documento (todas sus versiones) — usado por Cierre de Obra
   * (cualquier momento) e Infraestructura (solo mientras RECHAZADO_CIERRE,
   * al editar/reenviar una petición rechazada, ver AttachmentsSection). */
  const handleDeleteDocument = useCallback(
    async (projectId: string, documentId: number) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        await apiFetch(`/projects/${projectId}/documents/${documentId}`, { method: "DELETE", token });
        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(refreshed);
        show("Adjunto eliminado correctamente.", "success");
      } catch (error) {
        logError("handleDeleteDocument", error);
        show("No se pudo eliminar el adjunto.", "error");
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
    handleRejectProject,
    handleResubmitProject,
    handleDeleteDocument,
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
