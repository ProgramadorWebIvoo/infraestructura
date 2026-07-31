/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cálculos financieros agregados sobre un conjunto de proyectos. Extraído
 * de PresidenciaDashboard para que la vista se limite a presentación.
 * Es el fallback cliente de /api/dashboard/summary (ver computeDashboardSummary).
 */

import { useMemo } from "react";
import type { Project } from "../types";

export interface ProjectFinancials {
  totalApprovedInvestment: number;
  totalReleasedFunds: number;
  pendingFunds: number;
  /** Porcentaje liberado vs aprobado, clampado a 100 para la barra de UI. */
  releasedPercent: number;
  /** Monto liberado por encima de lo aprobado (sobre-ejecución), si existe. */
  excessReleased: number;
}

export function useProjectFinancials(projects: Project[]): ProjectFinancials {
  return useMemo(() => {
    let totalApprovedInvestment = 0;
    let totalReleasedFunds = 0;
    projects.forEach((p) => {
      totalApprovedInvestment += p.approvedInvestmentAmount ?? p.estimatedTotal;
      if (p.advancePaidAmount) totalReleasedFunds += p.advancePaidAmount;
      if (p.finalPaidAmount) totalReleasedFunds += p.finalPaidAmount;
    });
    const rawPercent = (totalReleasedFunds / (totalApprovedInvestment || 1)) * 100;
    return {
      totalApprovedInvestment,
      totalReleasedFunds,
      pendingFunds: Math.max(0, totalApprovedInvestment - totalReleasedFunds),
      releasedPercent: Math.min(100, Math.round(rawPercent)),
      excessReleased: Math.max(0, totalReleasedFunds - totalApprovedInvestment),
    };
  }, [projects]);
}
