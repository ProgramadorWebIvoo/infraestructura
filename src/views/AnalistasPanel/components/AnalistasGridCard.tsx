/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en la lista de expedientes en
 * licitación de Analistas — mismo criterio que
 * ProcuraPanel/components/BidEvaluationGridCard.tsx.
 */

import { MapPin, Trophy, Wallet } from "lucide-react";
import type { Project } from "../../../types";
import { formatCurrency } from "../../../utils";

export function renderAnalistasCard(project: Project) {
  const proposals = project.proposals ?? [];
  const best = proposals.length > 0 ? proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]) : null;

  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-emerald-700 whitespace-nowrap">{project.id}</span>
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">
          {proposals.length} propuesta{proposals.length !== 1 ? "s" : ""}
        </span>
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
        <span className="font-mono font-bold text-slate-600 text-[11px] whitespace-nowrap">{formatCurrency(project.approvedInvestmentAmount ?? 0)}</span>
      </div>

      {best && (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
            <Trophy className="h-3 w-3 shrink-0" /> Mejor oferta
          </span>
          <span className="font-mono font-black text-emerald-700 text-[11px] whitespace-nowrap">{formatCurrency(best.totalCost)}</span>
        </div>
      )}
    </div>
  );
}
