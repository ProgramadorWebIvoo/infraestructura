/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Evaluación Comparativa de Ofertas
 * (Procura) — el componente genérico (src/components/UI/GridView) no
 * conoce "expedientes"; este archivo es el consumidor que decide qué
 * pintar dentro de cada tarjeta, vía la prop `renderCard`.
 */

import { MapPin, Trophy } from "lucide-react";
import type { Project } from "../../../types";
import { formatCurrency } from "../../../utils";
import BsAmount from "../../../components/UI/BsAmount";

export function renderBidEvaluationCard(
  project: Project,
  convert?: (amount: number, fromCode: string) => number,
  hasRates?: boolean,
  isLoadingRates?: boolean,
) {
  const proposals = project.proposals ?? [];
  const best = proposals.length > 0 ? proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]) : null;

  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-success-700 whitespace-nowrap">{project.id}</span>
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-success-100 text-success-700 whitespace-nowrap">
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

      {best && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success-700">
            <Trophy className="h-3 w-3 shrink-0" /> Mejor oferta
          </span>
          <div className="text-right">
            <div className="font-mono font-black text-success-700 text-[11px] whitespace-nowrap">{formatCurrency(best.totalCost)}</div>
            {convert && (
              <BsAmount amount={best.totalCost} convert={convert} hasRates={!!hasRates} isLoading={!!isLoadingRates} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
