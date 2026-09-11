/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Finiquitos (Finanzas) — el
 * componente genérico (src/components/UI/GridView) no conoce "liquidaciones
 * pendientes"; este archivo es el consumidor que decide qué pintar dentro
 * de cada tarjeta, vía la prop `renderCard`.
 */

import { CreditCard } from "lucide-react";
import Button from "@/components/UI/Button";
import { formatNumber } from "@/utils";
import type { Project, Proposal } from "@/types";

export function renderFinalSettlementCard(project: Project, winner: Proposal, balanceDue: number, paidAdvance: number, onOpenConfirm: () => void) {
  return (
    <div className="p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[9px] font-mono font-bold text-slate-400">{project.id}</span>
          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{project.title}</h4>
        </div>
        <span className="text-[9px] font-mono bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-800 border border-sky-200 px-2 py-1 rounded-lg font-bold shrink-0">
          Calidad OK
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-gradient-to-br from-sky-50/40 to-white border border-sky-100/60 text-[11px]">
        <div className="min-w-0">
          <span className="text-[9px] text-slate-500 font-bold block mb-0.5">Contratista:</span>
          <span className="font-bold text-slate-800 line-clamp-1">{winner.contractorName}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-bold block mb-0.5">Anticipo pagado:</span>
          <span className="font-mono font-bold text-slate-600">${paidAdvance.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
        <div>
          <span className="text-[9px] text-slate-400 font-bold block">Total obra:</span>
          <span className="font-mono font-bold text-slate-600 text-xs">${winner.totalCost.toLocaleString()}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider text-sky-600 mb-0.5">Saldo a Liquidar:</span>
          <span className="font-mono font-black text-slate-900 text-sm">${formatNumber(balanceDue)}</span>
        </div>
      </div>

      <Button
        id={`btn-pay-final-${project.id}`}
        onClick={(e) => { e.stopPropagation(); onOpenConfirm(); }}
        variant="primary"
        colorScheme="sky"
        size="md"
        className="w-full"
        icon={<CreditCard className="h-4 w-4" />}
      >
        Aprobar y Transferir
      </Button>
    </div>
  );
}
