/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows del cierre posterior a la ejecución (finiquito): residente →
 * Auditoría → Procura. Sin actualización optimista: el backend valida cada
 * paso (photos, roles, estado) y el error se propaga para que la UI
 * conserve su modal.
 */

import { useCallback } from "react";
import type { Project } from "@/types";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { WorkflowContext } from "./shared";
import type { AuditMeasurement, ResidentMeasurement } from "@/components/ClosureReport/closureMeasurements";

export function useClosureWorkflows({ authTokenRef, syncProjectRef }: WorkflowContext) {
  const post = useCallback(
    async (projectId: string, action: string, body: Record<string, unknown> | undefined, label: string) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/closure-report/${action}`, {
          method: "POST",
          token: authTokenRef.current,
          body: body ? JSON.stringify(body) : undefined,
        });
        syncProjectRef.current(project);
      } catch (error) {
        logError(label, error);
        throw error;
      }
    },
    [authTokenRef, syncProjectRef],
  );

  const handleResidentApproval = useCallback(
    (projectId: string, notes: string | undefined, items: ResidentMeasurement[]) => post(projectId, "resident-approval", { notes, items }, "handleResidentApproval"),
    [post],
  );
  const handleRejectClosure = useCallback((projectId: string, reason: string) => post(projectId, "rejection", { reason }, "handleRejectClosure"), [post]);
  const handleAuditApproval = useCallback(
    (projectId: string, notes: string | undefined, items: AuditMeasurement[]) => post(projectId, "audit-approval", { notes, items }, "handleAuditApproval"),
    [post],
  );
  const handleRequestFiniquito = useCallback((projectId: string, notes?: string) => post(projectId, "finiquito-request", { notes }, "handleRequestFiniquito"), [post]);
  const handleReturnFiniquito = useCallback((projectId: string, reason: string) => post(projectId, "finiquito-return", { reason }, "handleReturnFiniquito"), [post]);

  const handleUploadResidentPhoto = useCallback(
    async (projectId: string, file: File) => {
      const form = new FormData();
      form.append("image", file);
      try {
        await apiFetch(`/projects/${projectId}/closure-report/photos`, { method: "POST", token: authTokenRef.current, body: form });
      } catch (error) {
        logError("handleUploadResidentPhoto", error);
        throw error;
      }
    },
    [authTokenRef],
  );

  const handleResendClosureLink = useCallback(
    async (projectId: string) => {
      try {
        return await apiFetch<{ mailSent: boolean }>(`/projects/${projectId}/closure-report/resend-link`, { method: "POST", token: authTokenRef.current });
      } catch (error) {
        logError("handleResendClosureLink", error);
        throw error;
      }
    },
    [authTokenRef],
  );

  const handleAssignResident = useCallback(
    async (projectId: string, residentUserId: number | null) => {
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/resident`, {
          method: "PATCH",
          token: authTokenRef.current,
          body: JSON.stringify({ residentUserId }),
        });
        syncProjectRef.current(project);
      } catch (error) {
        logError("handleAssignResident", error);
        throw error;
      }
    },
    [authTokenRef, syncProjectRef],
  );

  return {
    handleResidentApproval,
    handleRejectClosure,
    handleAuditApproval,
    handleRequestFiniquito,
    handleReturnFiniquito,
    handleUploadResidentPhoto,
    handleResendClosureLink,
    handleAssignResident,
  };
}

export type ClosureActions = ReturnType<typeof useClosureWorkflows>;
