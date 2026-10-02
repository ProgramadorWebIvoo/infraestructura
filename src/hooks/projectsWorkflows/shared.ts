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

/** Archivos por campo de la petición (`photos`, `documents`, `plans`, `files`…). */
export type AttachmentFiles = Record<string, File[]>;

/** Respuesta de los procesos que adjuntan archivos: el proyecto + cuántos archivos optimizó/normalizó el backend. */
export type ProjectWithAttachments = Project & { optimizedCount?: number };

/**
 * Cuerpo de un proceso que adjunta archivos EN LA MISMA petición: el backend
 * los guarda junto con el proceso en una sola transacción, así que un archivo
 * rechazado (pared de seguridad, tipo, tamaño) tumba el proceso completo en
 * vez de dejarlo registrado sin el adjunto. Sin archivos viaja JSON plano;
 * con archivos, multipart con el resto de campos como JSON en `payload`
 * (los arrays anidados como `materials` no se expresan bien en FormData).
 */
export function buildProcessBody(
  payload: object,
  files: AttachmentFiles = {},
  replacements: { documentId: number; file: File }[] = [],
): string | FormData {
  const hasFiles = Object.values(files).some(list => list.length > 0) || replacements.length > 0;
  if (!hasFiles) return JSON.stringify(payload);

  const form = new FormData();
  form.append("payload", JSON.stringify(payload));
  Object.entries(files).forEach(([field, list]) => list.forEach(file => form.append(`${field}[]`, file)));
  replacements.forEach((r, index) => {
    form.append(`replacements[${index}][documentId]`, String(r.documentId));
    form.append(`replacements[${index}][file]`, r.file);
  });
  return form;
}

/**
 * Separa el proyecto del contador de archivos optimizados (no es un campo de
 * `Project`: no debe quedar en el estado) y, si hubo, avisa al usuario.
 */
export function settleAttachments(show: ShowToast, result: ProjectWithAttachments): Project {
  const { optimizedCount = 0, ...project } = result;
  if (optimizedCount > 0) {
    show(`${optimizedCount} archivo(s) optimizado(s) o normalizado(s) automáticamente antes de guardarse.`, "info");
  }
  return project as Project;
}
