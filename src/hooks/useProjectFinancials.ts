/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cálculos financieros agregados sobre un conjunto de proyectos. Extraído
 * de PresidenciaDashboard para que la vista se limite a presentación.
 */

import { useMemo } from "react";
import type { Project } from "../types";

export interface ProjectFinancials {
  totalApprovedInvestment: number;
  totalReleasedFunds: number;
  pendingFunds: number;
  releasedPercent: number;
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
    return {
      totalApprovedInvestment,
      totalReleasedFunds,
      pendingFunds: Math.max(0, totalApprovedInvestment - totalReleasedFunds),
      releasedPercent: Math.round((totalReleasedFunds / (totalApprovedInvestment || 1)) * 100),
    };
  }, [projects]);
}
