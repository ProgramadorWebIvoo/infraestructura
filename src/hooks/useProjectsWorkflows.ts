/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Facade de workflows de proyectos — compone los sub-hooks por dominio de
 * negocio (`hooks/projectsWorkflows/`) sobre un contexto compartido de
 * refs (evita race conditions por cambio de token/showToast durante un
 * fetch en vuelo).
 *
 * Antes: 795 líneas / 22 handlers en este único archivo, confirmado como
 * toxic hotspot por graphify (complejidad × churn de Git — 14 commits
 * distintos lo tocaron). Dividido en:
 * - `useReviewWorkflows`     → Infraestructura / Cierre de Obra (expediente)
 * - `useProcurementWorkflows` → Procura / Analistas (comparativa, propuestas)
 * - `usePaymentWorkflows`     → Finanzas / verificación de cierre
 *
 * La API pública de este hook (forma del objeto devuelto) no cambió — los
 * callers (useProjects.ts, tests) no requieren modificación.
 */

import { useWorkflowContext, type UseProjectsWorkflowsOptions } from "./projectsWorkflows/shared";
import { useReviewWorkflows } from "./projectsWorkflows/useReviewWorkflows";
import { useProcurementWorkflows } from "./projectsWorkflows/useProcurementWorkflows";
import { usePaymentWorkflows } from "./projectsWorkflows/usePaymentWorkflows";

export type { UseProjectsWorkflowsOptions };

export function useProjectsWorkflows(options: UseProjectsWorkflowsOptions) {
  const ctx = useWorkflowContext(options);

  const review = useReviewWorkflows(ctx);
  const procurement = useProcurementWorkflows(ctx);
  const payments = usePaymentWorkflows(ctx);

  return {
    ...review,
    ...procurement,
    ...payments,
  };
}
