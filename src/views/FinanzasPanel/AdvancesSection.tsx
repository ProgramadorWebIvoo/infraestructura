/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Finanzas: liberación de anticipos pactados — extraída de
 * FinanzasPanel.
 */

import { useState } from "react";
import { CheckCircle, Coins, CreditCard } from "lucide-react";
import Button from "../../components/UI/Button";
import type { Project } from "../../types";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import EmptyState from "../../components/UI/EmptyState";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import { formatNumber } from "../../utils";

interface AdvancesSectionProps {
  pendingAdvances: Project[];
  onPayAdvance: (projectId: string, amount: number) => void;
}

export default function AdvancesSection({ pendingAdvances, onPayAdvance }: AdvancesSectionProps) {
  const [confirmPayAdvance, setConfirmPayAdvance] = useState<{ projectId: string; amount: number; title: string } | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  return (
    <Card className="border-l-4 border-l-rose-400 max-h-115 overflow-y-auto scroll-smooth">
      <SectionHeader
        icon={<Coins className="h-5 w-5" />}
        title="Liberación de Anticipos Pactados (Inicio Obra)"
        description="Autorice el primer desembolso de fondos acordado para que el contratista inicie los trabajos de campo."
        color="rose"
      />

      {pendingAdvances.length === 0 ? (
        <EmptyState
          message="No hay anticipos pendientes por liberar."
          icon={<CheckCircle className="h-8 w-8 text-slate-300" />}
        />
      ) : (
        <div className="space-y-4">
          {pendingAdvances.map((p) => {
            const winner = p.proposals?.find(prop => prop.contractorCode === p.selectedContractorCode);
            if (!winner) return null;
            const advAmount = winner.totalCost * (winner.negotiatedAdvancePercent / 100);

            return (
              <div key={p.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                  </div>
                  <span className="text-[9px] font-mono bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
                    Anticipo Pendiente
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gradient-to-br from-rose-50/40 to-white border border-rose-100/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Contratista adjudicado:</span>
                    <span className="font-bold text-slate-800">{winner.contractorName}</span>
                    <span className="font-mono text-[9px] text-sky-600 font-bold block mt-0.5">({winner.contractorCode})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Porcentaje Anticipo:</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">{winner.negotiatedAdvancePercent}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Monto total de obra:</span>
                    <span className="font-mono font-bold text-slate-600">${winner.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider text-rose-500 mb-0.5">Monto Anticipo a Pagar:</span>
                    <span className="font-mono font-black text-slate-900 text-base">${formatNumber(advAmount)}</span>
                  </div>
                </div>

                <Button
                  id={`btn-pay-advance-${p.id}`}
                  onClick={() => setConfirmPayAdvance({ projectId: p.id, amount: advAmount, title: p.title })}
                  variant="primary"
                  colorScheme="rose"
                  size="md"
                  className="w-full"
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  Liberar Desembolso de Anticipo Bancario
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmPayAdvance}
        onClose={() => setConfirmPayAdvance(null)}
        onConfirm={async () => {
          if (!confirmPayAdvance) return;
          setIsPaying(true);
          try {
            await onPayAdvance(confirmPayAdvance.projectId, confirmPayAdvance.amount);
            setConfirmPayAdvance(null);
          } finally {
            setIsPaying(false);
          }
        }}
        title="Liberar Anticipo"
        message={`¿Estás seguro de liberar el anticipo de $${formatNumber(confirmPayAdvance?.amount ?? 0)} para la obra "${confirmPayAdvance?.title ?? ""}"? Esta acción registrará el pago en el diario de egresos y cambiará el estado del proyecto a "En ejecución".`}
        variant="warning"
        confirmLabel="Liberar anticipo"
        isLoading={isPaying}
      />
    </Card>
  );
}
