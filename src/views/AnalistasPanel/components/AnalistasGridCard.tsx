/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en la lista de expedientes en
 * licitación de Analistas — mismo criterio que
 * ProcuraPanel/components/BidEvaluationGridCard.tsx.
 */

import { AlertTriangle, MapPin, Trophy, Wallet } from "lucide-react";
import type { Project, SupplierMaterialProposal } from "../../../types";
import { formatCurrency } from "../../../utils";
import { calculatePendingPortalProposals } from "../utils/portalProposalUtils";
import BsAmount from "../../../components/UI/BsAmount";

export function renderAnalistasCard(
  project: Project,
  portalProposals: SupplierMaterialProposal[] = [],
  convert?: (amount: number, fromCode: string) => number,
  hasRates?: boolean,
  isLoadingRates?: boolean,
) {
  const proposals = project.proposals ?? [];
  const best = proposals.length > 0 ? proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]) : null;
  const pendingFromPortal = calculatePendingPortalProposals(portalProposals.length, proposals);
  const hasPendingPortalProposals = pendingFromPortal > 0;

  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-emerald-700 whitespace-nowrap">{project.id}</span>
        <div className="flex items-center gap-1.5">
          {hasPendingPortalProposals && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-danger-100 text-danger-700 whitespace-nowrap animate-pulse">
              <AlertTriangle className="h-2.5 w-2.5" /> {pendingFromPortal} sin cargar
            </span>
          )}
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">
            {proposals.length} propuesta{proposals.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{project.title}</div>
        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {project.location}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
          <Wallet className="h-3 w-3 shrink-0" /> Techo aprobado
        </span>
        <div className="text-right">
          <div className="font-mono font-bold text-slate-600 text-[11px] whitespace-nowrap">{formatCurrency(project.approvedInvestmentAmount ?? 0)}</div>
          {convert && (
            <BsAmount amount={project.approvedInvestmentAmount ?? 0} convert={convert} hasRates={!!hasRates} isLoading={!!isLoadingRates} />
          )}
        </div>
      </div>

      {best && (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <Trophy className="h-3 w-3 shrink-0" /> Mejor oferta
          </span>
          <div className="text-right">
            <div className="font-mono font-black text-emerald-700 text-[11px] whitespace-nowrap">{formatCurrency(best.totalCost)}</div>
            {convert && (
              <BsAmount amount={best.totalCost} convert={convert} hasRates={!!hasRates} isLoading={!!isLoadingRates} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
