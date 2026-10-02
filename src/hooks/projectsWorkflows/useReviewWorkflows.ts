/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows del expediente técnico: creación (Infraestructura), revisión y
 * rechazo/reenvío (Auditoría), reevaluación (Procura ↔ Auditoría)
 * y eliminación de adjuntos. Extraído de useProjectsWorkflows.ts (antes 795
 * líneas / 22 handlers en un solo archivo — ver graphify toxic hotspot).
 *
 * Los procesos que llevan adjuntos (crear, reenviar, rechazar, reevaluar) los
 * mandan en la MISMA petición que el proceso: el backend los guarda juntos en
 * una sola transacción, así que un archivo rechazado (código embebido, tipo,
 * tamaño) tumba el proceso completo — nunca queda un proceso registrado sin
 * sus archivos.
 */

import { useCallback } from "react";
import type { Project, ProjectDocument } from "@/types";
import { ProjectStatus } from "@/types";
import type { NewProjectPayload, ResubmitProjectPayload } from "@/utils/projectLocation";
import { apiFetch } from "@/services/api";
import { getErrorMessage, logError } from "@/services/logger";
import { buildProcessBody, settleAttachments, type ProjectWithAttachments, type WorkflowContext } from "./shared";

export function useReviewWorkflows({
  authTokenRef,
  showToastRef,
  syncProjectRef,
  optimisticUpdate,
}: WorkflowContext) {
  /** Crea la obra con sus adjuntos; si un archivo es rechazado no se crea nada. */
  const handleAddProject = useCallback(
    async (
      newProj: NewProjectPayload,
      files: { photos: File[]; documents: File[]; plans: File[] },
    ): Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }> => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      try {
        const result = await apiFetch<ProjectWithAttachments>("/projects", {
          method: "POST",
          token,
          body: buildProcessBody(newProj, files),
          transferLabel: "Enviando petición con adjuntos",
        });
        sync(settleAttachments(show, result));
        show("Petición de Infraestructura registrada con éxito y enviada a Auditoría.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      } catch (error) {
        logError("handleAddProject", error);
        show(`No se pudo registrar la obra. ${getErrorMessage(error, "")}`.trim(), "error");
        return { ok: false, partial: false, failedGroups: [] };
      }
    },
    [authTokenRef, showToastRef, syncProjectRef],
  );

  /** Auditoría audita la petición — no sube documentación propia, solo
   * confirma lo ya adjuntado por Infraestructura (ver TechnicalReviewSection). */
  const handleReviewProject = useCallback(
    async (projectId: string, notes: string, residentUserId?: number | null) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, { status: ProjectStatus.REVISADO_AUDITORIA, auditNotes: notes.trim() || undefined });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/review`, {
          method: "POST",
          token,
          body: JSON.stringify({ notes: notes.trim() || undefined, residentUserId: residentUserId ?? undefined }),
        });
        sync(project);
      } catch (error) {
        logError("handleReviewProject", error);
        if (previous) sync(previous);
        show(`No se pudo guardar la revisión técnica: ${getErrorMessage(error, "intente de nuevo")}`, "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  /** Rechaza la petición inicial (antes de revisión de planos) — distinto de
   * handleRejectProposals (Procura, rechaza el cuadro comparativo). Las
   * correcciones opcionales viajan en la misma petición: si un archivo es
   * rechazado, la petición no se rechaza. */
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

      const previous = optimisticUpdate(projectId, { status: ProjectStatus.RECHAZADO_AUDITORIA });
      try {
        const result = await apiFetch<ProjectWithAttachments>(`/projects/${projectId}/reject-project`, {
          method: "POST",
          token,
          body: buildProcessBody({ reason, observations: observations || undefined }, { files: correctionFiles }),
          transferLabel: "Enviando rechazo con correcciones",
        });
        sync(settleAttachments(show, result));
        show(
          correctionFiles.length > 0
            ? "Petición rechazada y correcciones adjuntadas correctamente."
            : "Petición rechazada correctamente.",
          "success",
        );
        return { ok: true, partial: false, failedGroups: [] };
      } catch (error) {
        logError("handleRejectProject", error);
        if (previous) sync(previous);
        show(`No se pudo rechazar la petición. ${getErrorMessage(error, "")}`.trim(), "error");
        return { ok: false, partial: false, failedGroups: [] };
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  /** Reenvía una petición previamente rechazada (mismo Project.id) con los campos
   * corregidos, contra /resubmit en vez de crear un proyecto. Los adjuntos viajan
   * en la misma petición: si alguno es rechazado no se reenvía nada y la petición
   * sigue rechazada, lista para corregir y reintentar.
   *
   * `existingDocuments` son los adjuntos vivos (no marcados para eliminar) que
   * el proyecto ya tenía antes de este reenvío. `versionReplacements` son
   * archivos elegidos EXPLÍCITAMENTE por el usuario (botón "Nueva versión" por
   * fila en AttachmentsSection) como reemplazo de un documento puntual — cada
   * uno sube con el id de esa fila, sin adivinar. Los 3 grupos de `files`
   * (fotos/documentos/planos) son siempre archivos nuevos sin vínculo, nunca
   * versionan nada existente. */
  const handleResubmitProject = useCallback(
    async (
      projectId: string,
      updated: ResubmitProjectPayload,
      files: { photos: File[]; documents: File[]; plans: File[] },
      _existingDocuments: ProjectDocument[] = [],
      versionReplacements: { documentId: number; documentType: ProjectDocument["documentType"]; file: File }[] = [],
    ): Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }> => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      try {
        const result = await apiFetch<ProjectWithAttachments>(`/projects/${projectId}/resubmit`, {
          method: "POST",
          token,
          body: buildProcessBody(updated, files, versionReplacements),
          transferLabel: "Reenviando petición corregida",
        });
        sync(settleAttachments(show, result));
        show("Petición corregida y reenviada a Auditoría.", "success");
        return { ok: true, partial: false, failedGroups: [] };
      } catch (error) {
        logError("handleResubmitProject", error);
        show(`No se pudo reenviar la petición corregida. ${getErrorMessage(error, "")}`.trim(), "error");
        return { ok: false, partial: false, failedGroups: [] };
      }
    },
    [authTokenRef, showToastRef, syncProjectRef],
  );

  /** Elimina un documento (todas sus versiones) — usado por Auditoría
   * (cualquier momento) e Infraestructura (solo mientras RECHAZADO_AUDITORIA,
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
   * recién llegado (REVISADO_AUDITORIA) antes de autorizar inversión. La
   * evidencia opcional viaja en la misma petición: si un archivo es
   * rechazado, el expediente no cambia de estado. */
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

      const previous = optimisticUpdate(projectId, { status: ProjectStatus.EN_REEVALUACION_AUDITORIA });
      try {
        const result = await apiFetch<ProjectWithAttachments>(`/projects/${projectId}/send-to-reevaluation`, {
          method: "POST",
          token,
          body: buildProcessBody({ reason, observations: observations || undefined }, { files: evidenceFiles }),
          transferLabel: "Enviando reevaluación con evidencia",
        });
        sync(settleAttachments(show, result));
        show(
          evidenceFiles.length > 0
            ? "Expediente enviado a reevaluación y evidencia adjuntada correctamente."
            : "Expediente enviado a reevaluación de Auditoría.",
          "success",
        );
        return { ok: true, partial: false, failedGroups: [] };
      } catch (error) {
        logError("handleSendToReevaluation", error);
        if (previous) sync(previous);
        show(`No se pudo enviar el expediente a reevaluación. ${getErrorMessage(error, "")}`.trim(), "error");
        return { ok: false, partial: false, failedGroups: [] };
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  /** Auditoría resuelve una reevaluación solicitada por Procura y
   * reenvía el expediente a REVISADO_AUDITORIA. */
  const handleResolveReevaluation = useCallback(
    async (projectId: string, notes?: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const previous = optimisticUpdate(projectId, { status: ProjectStatus.REVISADO_AUDITORIA });
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
