/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Finanzas: finiquitos y liquidaciones de cierre — extraída de
 * FinanzasPanel.
 */

import { useState } from "react";
import { CheckCircle, CreditCard, DollarSign } from "lucide-react";
import Button from "../../../components/UI/Button";
import type { Project } from "../../../types";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import ConfirmDialog from "../../../components/UI/ConfirmDialog";
import { formatNumber } from "../../../utils";

interface FinalSettlementsSectionProps {
  pendingFinalPayments: Project[];
  onPayFinal: (projectId: string, amount: number) => void;
}

export default function FinalSettlementsSection({ pendingFinalPayments, onPayFinal }: FinalSettlementsSectionProps) {
  const [confirmPayFinal, setConfirmPayFinal] = useState<{ projectId: string; amount: number; title: string } | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  return (
    <Card className="border-l-4 border-l-sky-400 h-full flex flex-col">
      <SectionHeader
        icon={<DollarSign className="h-5 w-5" />}
        title="Finiquitos y Liquidaciones de Cierre (100%)"
        description="Cierre el ciclo financiero de la obra pagando el saldo restante, previa certificación de calidad por Cierre de Obra."
        color="sky"
      />

      {pendingFinalPayments.length === 0 ? (
        <div className="flex-1 flex items-center">
          <EmptyState
            className="w-full"
            message="No hay liquidaciones pendientes."
            icon={<CheckCircle className="h-8 w-8 text-slate-300" />}
          />
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto scroll-smooth max-h-115 pr-1">
          {pendingFinalPayments.map((p) => {
            const winner = p.proposals?.find(prop => prop.contractorCode === p.selectedContractorCode);
            if (!winner) return null;
            const paidAdvance = p.advancePaidAmount || 0;
            const balanceDue = winner.totalCost - paidAdvance;

            return (
              <div key={p.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                  </div>
                  <span className="text-[9px] font-mono bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-lg font-bold">
                    Aprobación de Calidad OK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gradient-to-br from-sky-50/40 to-white border border-sky-100/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Contratista ejecutor:</span>
                    <span className="font-bold text-slate-800">{winner.contractorName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Anticipo ya pagado:</span>
                    <span className="font-mono font-bold text-slate-600">${paidAdvance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Monto total de obra:</span>
                    <span className="font-mono font-bold text-slate-600">${winner.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider text-sky-600 mb-0.5">Saldo Pendiente a Liquidar:</span>
                    <span className="font-mono font-black text-slate-900 text-base">${formatNumber(balanceDue)}</span>
                  </div>
                </div>

                <Button
                  id={`btn-pay-final-${p.id}`}
                  onClick={() => setConfirmPayFinal({ projectId: p.id, amount: balanceDue, title: p.title })}
                  variant="primary"
                  colorScheme="sky"
                  size="md"
                  className="w-full"
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  Aprobar y Transferir Finiquito de Obra
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmPayFinal}
        onClose={() => setConfirmPayFinal(null)}
        onConfirm={async () => {
          if (!confirmPayFinal) return;
          setIsPaying(true);
          try {
            await onPayFinal(confirmPayFinal.projectId, confirmPayFinal.amount);
            setConfirmPayFinal(null);
          } finally {
            setIsPaying(false);
          }
        }}
        title="Aprobar Pago Final"
        message={`¿Estás seguro de aprobar el finiquito de $${formatNumber(confirmPayFinal?.amount ?? 0)} para la obra "${confirmPayFinal?.title ?? ""}"? Esta acción cerrará el ciclo financiero del proyecto.`}
        variant="warning"
        confirmLabel="Aprobar finiquito"
        isLoading={isPaying}
      />
    </Card>
  );
}
