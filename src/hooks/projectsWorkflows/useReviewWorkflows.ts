/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows del expediente técnico: creación (Infraestructura), revisión y
 * rechazo/reenvío (Auditoría), reevaluación (Procura ↔ Auditoría)
 * y eliminación de adjuntos. Extraído de useProjectsWorkflows.ts (antes 795
 * líneas / 22 handlers en un solo archivo — ver graphify toxic hotspot).
 */

import { useCallback } from "react";
import type { Project, ProjectDocument } from "@/types";
import { ProjectStatus } from "@/types";
import { apiFetch } from "@/services/api";
import { getErrorMessage, logError } from "@/services/logger";
import { describeUploadFailures, uploadDocumentGroup, type UploadDocumentGroupResult, type WorkflowContext } from "./shared";

export function useReviewWorkflows({
  authTokenRef,
  showToastRef,
  syncProjectRef,
  optimisticUpdate,
}: WorkflowContext) {
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

      const results = await Promise.all([
        uploadDocumentGroup(project.id, files.photos, "FOTO", "fotos", token, "handleAddProject:upload:FOTO"),
        uploadDocumentGroup(project.id, files.documents, "CALC", "documentos", token, "handleAddProject:upload:CALC"),
        uploadDocumentGroup(project.id, files.plans, "PLANO", "planos", token, "handleAddProject:upload:PLANO"),
      ]);
      const failedGroups = results.filter(r => r.failedGroup !== null);
      const optimizedCount = results.reduce((sum, r) => sum + r.optimizedCount, 0);

      try {
        const refreshed = await apiFetch<Project>(`/projects/${project.id}`, { token });
        sync(refreshed);
      } catch (error) {
        logError("handleAddProject:refresh", error);
      }

      if (failedGroups.length === 0) {
        show("Petición de Infraestructura registrada con éxito y enviada a Auditoría.", "success");
        if (optimizedCount > 0) {
          show(`${optimizedCount} imagen(es) optimizada(s) automáticamente antes de guardarse.`, "info");
        }
        return { ok: true, partial: false, failedGroups: [] };
      }

      show(describeUploadFailures(failedGroups), "warning");
      return { ok: true, partial: true, failedGroups: failedGroups.map(g => g.failedGroup as string) };
    },
    [authTokenRef, showToastRef, syncProjectRef],
  );

  /** Auditoría audita la petición — no sube documentación propia, solo
   * confirma lo ya adjuntado por Infraestructura (ver TechnicalReviewSection). */
  const handleReviewProject = useCallback(
    async (projectId: string, notes: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, { status: ProjectStatus.REVISADO_CIERRE, auditNotes: notes.trim() || undefined });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/review`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes: notes.trim() || undefined }),
        });
        sync(project);
      } catch (error) {
        logError("handleReviewProject", error);
        if (previous) sync(previous);
        show("No se pudo guardar la revisión técnica.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
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

      const previous = optimisticUpdate(projectId, { status: ProjectStatus.RECHAZADO_CIERRE });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/reject-project`, {
          method: "POST",
          token,
          body: JSON.stringify({ reason, observations: observations || undefined }),
        });
        sync(project);
      } catch (error) {
        logError("handleRejectProject", error);
        if (previous) sync(previous);
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
        show(
          getErrorMessage(error, "Petición rechazada, pero no se pudieron adjuntar las correcciones."),
          "warning",
        );
        return { ok: true, partial: true, failedGroups: ["correcciones"] };
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
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

      const uploadReplacement = async (documentId: number, documentType: ProjectDocument["documentType"], file: File): Promise<UploadDocumentGroupResult> => {
        const form = new FormData();
        form.append("document_type", documentType);
        form.append("new_version_of", String(documentId));
        form.append("files[]", file);
        try {
          const saved = await apiFetch<ProjectDocument[]>(`/projects/${projectId}/documents`, { method: "POST", token, body: form });
          return { failedGroup: null, optimizedCount: saved.filter(d => d.optimized).length };
        } catch (error) {
          logError(`handleResubmitProject:uploadReplacement:${documentId}`, error);
          return { failedGroup: `nueva versión de ${file.name}`, errorMessage: getErrorMessage(error), optimizedCount: 0 };
        }
      };

      const results = await Promise.all([
        uploadDocumentGroup(projectId, files.photos, "FOTO", "fotos", token, "handleResubmitProject:upload:FOTO"),
        uploadDocumentGroup(projectId, files.documents, "CALC", "documentos", token, "handleResubmitProject:upload:CALC"),
        uploadDocumentGroup(projectId, files.plans, "PLANO", "planos", token, "handleResubmitProject:upload:PLANO"),
        ...versionReplacements.map((r) => uploadReplacement(r.documentId, r.documentType, r.file)),
      ]);
      const failedGroups = results.filter(r => r.failedGroup !== null);
      const optimizedCount = results.reduce((sum, r) => sum + r.optimizedCount, 0);

      try {
        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(refreshed);
      } catch (error) {
        logError("handleResubmitProject:refresh", error);
      }

      if (failedGroups.length === 0) {
        show("Petición corregida y reenviada a Auditoría.", "success");
        if (optimizedCount > 0) {
          show(`${optimizedCount} imagen(es) optimizada(s) automáticamente antes de guardarse.`, "info");
        }
        return { ok: true, partial: false, failedGroups: [] };
      }

      show(describeUploadFailures(failedGroups), "warning");
      return { ok: true, partial: true, failedGroups: failedGroups.map(g => g.failedGroup as string) };
    },
    [authTokenRef, showToastRef, syncProjectRef],
  );

  /** Elimina un documento (todas sus versiones) — usado por Auditoría
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
    [authTokenRef, showToastRef, syncProjectRef],
  );

  /** Procura devuelve a Auditoría, con motivo obligatorio, un expediente
   * recién llegado (REVISADO_CIERRE) antes de autorizar inversión — mismo
   * shape de dos fases que handleRejectProject (JSON de motivo + upload
   * multipart opcional de evidencia + refetch). */
  const handleSendToReevaluation = useCallback(
    async (
      projectId: string,
      reason: string,
      observations?: string,
      evidenceFiles: File[] = [],
    ): Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }> => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      const previous = optimisticUpdate(projectId, { status: ProjectStatus.EN_REEVALUACION_CIERRE });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/send-to-reevaluation`, {
          method: "POST",
          token,
          body: JSON.stringify({ reason, observations: observations || undefined }),
        });
        sync(project);
      } catch (error) {
        logError("handleSendToReevaluation", error);
        if (previous) sync(previous);
        show("No se pudo enviar el expediente a reevaluación.", "error");
        return { ok: false, partial: false, failedGroups: [] };
      }

      if (evidenceFiles.length === 0) {
        show("Expediente enviado a reevaluación de Auditoría.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      }

      try {
        const form = new FormData();
        form.append("document_type", "REEVALUACION");
        evidenceFiles.forEach(f => form.append("files[]", f));
        await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });

        const refreshed = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(refreshed);
        show("Expediente enviado a reevaluación y evidencia adjuntada correctamente.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      } catch (error) {
        logError("handleSendToReevaluation:uploadEvidence", error);
        show(
          getErrorMessage(error, "Expediente enviado a reevaluación, pero no se pudo adjuntar la evidencia."),
          "warning",
        );
        return { ok: true, partial: true, failedGroups: ["evidencia"] };
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  /** Auditoría resuelve una reevaluación solicitada por Procura y
   * reenvía el expediente a REVISADO_CIERRE. */
  const handleResolveReevaluation = useCallback(
    async (projectId: string, notes?: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, { status: ProjectStatus.REVISADO_CIERRE });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/resolve-reevaluation`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes: notes || undefined }),
        });
        sync(project);
        show("Expediente reenviado a Procura.", "success");
      } catch (error) {
        logError("handleResolveReevaluation", error);
        if (previous) sync(previous);
        show("No se pudo reenviar el expediente a Procura.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  return {
    handleAddProject,
    handleReviewProject,
    handleRejectProject,
    handleResubmitProject,
    handleDeleteDocument,
    handleSendToReevaluation,
    handleResolveReevaluation,
  };
}
