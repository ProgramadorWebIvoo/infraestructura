/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflows de Finanzas (anticipo, finiquito, congelación manual de tasa) y
 * verificación de finalización de Cierre de Obra. Extraído de
 * useProjectsWorkflows.ts (antes 795 líneas / 22 handlers en un solo
 * archivo — ver graphify toxic hotspot).
 */

import { useCallback } from "react";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { WorkflowContext } from "./shared";

/** Sube el comprobante bancario ANTES de confirmar el pago — si el
 * comprobante falla, el pago nunca se registra (evita un anticipo/
 * finiquito "liberado" sin evidencia adjunta). */
async function uploadPaymentProof(
  projectId: string,
  documentType: "COMPROBANTE_ANTICIPO" | "COMPROBANTE_FINIQUITO",
  proofFile: File,
  token: string,
) {
  const form = new FormData();
  form.append("document_type", documentType);
  form.append("files[]", proofFile);
  await apiFetch(`/projects/${projectId}/documents`, { method: "POST", token, body: form });
}

export function usePaymentWorkflows({
  authTokenRef,
  showToastRef,
  syncProjectRef,
  getProjectRef,
  optimisticUpdate,
}: WorkflowContext) {
  const handlePayAdvance = useCallback(
    async (projectId: string, amount: number, proofFile: File) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      try {
        await uploadPaymentProof(projectId, "COMPROBANTE_ANTICIPO", proofFile, token);
      } catch (error) {
        logError("handlePayAdvance:uploadProof", error);
        show("No se pudo adjuntar el comprobante de pago. El anticipo no fue liberado.", "error");
        return;
      }

      const previous = optimisticUpdate(projectId, { status: ProjectStatus.EN_EJECUCION, advancePaidAmount: amount });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
          method: "POST",
          token,
          body: JSON.stringify({ paymentType: "ADVANCE", amount }),
        });
        sync(project);
      } catch (error) {
        logError("handlePayAdvance", error);
        if (previous) sync(previous);
        show("No se pudo registrar el anticipo.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  const handlePayFinal = useCallback(
    async (projectId: string, amount: number, proofFile: File) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;

      try {
        await uploadPaymentProof(projectId, "COMPROBANTE_FINIQUITO", proofFile, token);
      } catch (error) {
        logError("handlePayFinal:uploadProof", error);
        show("No se pudo adjuntar el comprobante de pago. El finiquito no fue liquidado.", "error");
        return;
      }

      const previous = optimisticUpdate(projectId, { status: ProjectStatus.COMPLETADO_PAGADO, finalPaidAmount: amount });
      try {
        const project = await apiFetch<Project>(`/projects/${projectId}/payments`, {
          method: "POST",
          token,
          body: JSON.stringify({ paymentType: "FINAL", amount }),
        });
        sync(project);
      } catch (error) {
        logError("handlePayFinal", error);
        if (previous) sync(previous);
        show("No se pudo registrar el pago final.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, optimisticUpdate],
  );

  /**
   * Override manual de tasa de cambio — exclusivo SUPERADMIN (ver
   * routes/api.php). El endpoint devuelve solo la fila de congelación
   * creada (no el Project completo, a diferencia del resto de estos
   * handlers), así que se refresca el proyecto con un GET para que
   * `project.rateFreezes` quede consistente con el servidor (incluye el
   * `supersededById` que el backend acaba de setear en la fila anterior).
   */
  const handleFreezeRateManually = useCallback(
    async (
      projectId: string,
      payload: { trigger: "CONTRATADO" | "PAGO_ANTICIPO" | "PAGO_FINIQUITO"; reason: string; amountBase?: number },
    ) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      try {
        await apiFetch(`/projects/${projectId}/rate-freezes`, {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });
        const project = await apiFetch<Project>(`/projects/${projectId}`, { token });
        sync(project);
        show("Tasa de cambio congelada manualmente.", "success");
      } catch (error) {
        logError("handleFreezeRateManually", error);
        show("No se pudo congelar la tasa manualmente.", "error");
        throw error;
      }
    },
    [authTokenRef, showToastRef, syncProjectRef],
  );

  const handleVerifyCompletion = useCallback(
    async (projectId: string) => {
      const token = authTokenRef.current;
      const show = showToastRef.current;
      const sync = syncProjectRef.current;
      const get = getProjectRef.current;
      const project = get(projectId);
      const isStartingVerification = project?.status === ProjectStatus.EN_EJECUCION;
      const nextStatus = isStartingVerification ? ProjectStatus.VERIFICANDO_FINALIZACION : ProjectStatus.LISTO_PAGO_FINAL;

      const previous = optimisticUpdate(projectId, { status: nextStatus });
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
        if (previous) sync(previous);
        show("No se pudo actualizar la verificación de cierre.", "error");
      }
    },
    [authTokenRef, showToastRef, syncProjectRef, getProjectRef, optimisticUpdate],
  );

  return {
    handlePayAdvance,
    handlePayFinal,
    handleFreezeRateManually,
    handleVerifyCompletion,
  };
}
