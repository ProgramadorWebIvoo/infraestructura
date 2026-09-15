/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contexto compartido por los sub-hooks de workflows de proyectos
 * (useReviewWorkflows, useProcurementWorkflows, usePaymentWorkflows) —
 * refs estables (evitan race conditions por cambio de token/showToast
 * durante un fetch en vuelo) + optimisticUpdate, construidos UNA sola vez
 * en useProjectsWorkflows (el facade) y pasados por parámetro a cada
 * sub-hook, en vez de que cada uno cree su propia copia de las refs.
 */

import { useCallback, useRef } from "react";
import type { Project } from "@/types";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ShowToast } from "../useProjects";

export interface UseProjectsWorkflowsOptions {
  authToken: string;
  showToast: ShowToast;
  syncProject: (project: Project) => void;
  refreshAuditLogs: () => Promise<void>;
  getProject: (id: string) => Project | undefined;
}

export interface WorkflowContext {
  authTokenRef: { current: string };
  showToastRef: { current: ShowToast };
  syncProjectRef: { current: (project: Project) => void };
  refreshAuditLogsRef: { current: () => Promise<void> };
  getProjectRef: { current: (id: string) => Project | undefined };
  /**
   * Aplica de inmediato el status (y campos opcionales) que el backend va a
   * confirmar, ANTES de esperar la respuesta real — sin esto, un proyecto
   * seguía apareciendo en la lista filtrada por su status anterior durante
   * todo el round-trip de red (varios segundos percibidos, reportado como
   * "acepto y el registro se mantiene unos segundos antes de desaparecer").
   * syncProject() ya actualiza el estado local de forma síncrona
   * (setProjects), así que esta llamada extra antes del fetch es la que
   * hace la diferencia visual — la llamada real después solo reemplaza el
   * optimista por los datos reales (auditLog, montos, fechas del servidor).
   *
   * Devuelve el snapshot previo para poder revertir si el fetch falla —
   * el catch de cada handler ya muestra el toast de error; sin la
   * reversión, el proyecto quedaría con un status que el backend nunca
   * confirmó, hasta el siguiente poll (hasta 25s).
   */
  optimisticUpdate: (projectId: string, patch: Partial<Project>) => Project | undefined;
}

export function useWorkflowContext(options: UseProjectsWorkflowsOptions): WorkflowContext {
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

  const optimisticUpdate = useCallback((projectId: string, patch: Partial<Project>): Project | undefined => {
    const current = getProjectRef.current(projectId);
    if (!current) return undefined;
    syncProjectRef.current({ ...current, ...patch });
    return current;
  }, []);

  return { authTokenRef, showToastRef, syncProjectRef, refreshAuditLogsRef, getProjectRef, optimisticUpdate };
}

/**
 * Sube un grupo de archivos (fotos/documentos/planos) al endpoint de
 * documentos de un proyecto — usado por `handleAddProject` y
 * `handleResubmitProject` (mismo shape de dos fases: JSON + upload
 * multipart opcional + refetch). Devuelve `null` si el grupo estaba vacío
 * o subió bien, o `groupLabel` si falló (para que el caller arme el
 * mensaje de "éxito parcial" con los grupos que no se pudieron adjuntar).
 */
export async function uploadDocumentGroup(
  projectId: string,
  list: File[],
  type: "FOTO" | "CALC" | "PLANO",
  groupLabel: string,
  token: string,
  logContext: string,
): Promise<string | null> {
  if (list.length === 0) return null;
  const form = new FormData();
  form.append("document_type", type);
  list.forEach(f => form.append("files[]", f));
  try {
    await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });
    return null;
  } catch (error) {
    logError(logContext, error);
    return groupLabel;
  }
}
