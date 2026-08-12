/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panorama financiero ejecutivo: aprobado → comprometido → liberado → pendiente
 * + indicadores de negociación (anticipo y plazo promedio) + señal de
 * sobre-ejecución cuando lo liberado supera lo aprobado.
 */

import { motion } from "motion/react";
import { Wallet, AlertTriangle, HandCoins, CalendarClock } from "lucide-react";
import type { DashboardSummary } from "../../../types";
import { itemVariants } from "../../../animations";

interface FinancialOverviewSectionProps {
  summary: DashboardSummary;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface FlowRowProps {
  label: string;
  amount: number;
  total: number;
  barClass: string;
  sub?: string;
}

function FlowRow({ label, amount, total, barClass, sub }: FlowRowProps) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-bold text-slate-600">{label}</span>
        <span className="text-xs font-mono font-black text-slate-800">${fmtMoney(amount)}</span>
      </div>
      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${barClass} h-2 rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
      {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FinancialOverviewSection({ summary }: FinancialOverviewSectionProps) {
  const { totalApprovedInvestment, totalCommittedAmount, totalReleasedFunds, pendingFunds, excessReleased } = summary;
  const base = totalApprovedInvestment || 1;
  const committedPct = Math.min(100, (totalCommittedAmount / base) * 100);
  const releasedPct = Math.min(100, (totalReleasedFunds / base) * 100);
  const pendingPct = Math.min(100, (pendingFunds / base) * 100);
  const overBudget = excessReleased > 0;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-indigo-400"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
          <Wallet className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Ejecución Financiera</h2>
          <p className="text-[11px] text-slate-500 font-medium">Aprobado · Comprometido · Liberado · Pendiente</p>
        </div>
        {overBudget && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
            <AlertTriangle className="h-3 w-3" />
            Sobre-ejecución ${fmtMoney(excessReleased)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4 lg:col-span-2">
          <FlowRow label="Presupuesto Aprobado" amount={totalApprovedInvestment} total={totalApprovedInvestment} barClass="bg-gradient-to-r from-sky-400 to-sky-600" sub="Referencia del total (100%)" />
          <FlowRow label="Comprometido (contratos vigentes)" amount={totalCommittedAmount} total={totalApprovedInvestment} barClass="bg-gradient-to-r from-indigo-400 to-indigo-600" sub={`${Math.round(committedPct)}% del presupuesto aprobado`} />
          <FlowRow label="Fondos Liberados" amount={totalReleasedFunds} total={totalApprovedInvestment} barClass="bg-gradient-to-r from-emerald-400 to-emerald-600" sub={overBudget ? `${Math.round(releasedPct)}% del presupuesto (excede lo aprobado)` : `${Math.round(releasedPct)}% del presupuesto aprobado`} />
          <FlowRow label="Pendiente por Ejecutar" amount={pendingFunds} total={totalApprovedInvestment} barClass={overBudget ? "bg-rose-300" : "bg-gradient-to-r from-amber-400 to-amber-600"} sub={overBudget ? "No hay pendiente — lo liberado supera lo aprobado" : `${Math.round(pendingPct)}% del presupuesto aprobado`} />
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Cada barra mide el monto contra el presupuesto aprobado (máx. 100%). Si lo liberado supera lo aprobado,
            la barra llega al tope y el badge de sobre-ejecución indica el exceso.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <HandCoins className="h-4 w-4 text-indigo-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                Anticipo Promedio
              </span>
            </div>
            <p className="text-xl font-black font-mono text-slate-800">
              {summary.negotiationMetrics.avgAdvancePercent}%
            </p>
            <p className="text-[10px] text-slate-400 font-medium">sobre propuestas adjudicadas</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="h-4 w-4 text-indigo-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                Plazo Promedio
              </span>
            </div>
            <p className="text-xl font-black font-mono text-slate-800">
              {summary.negotiationMetrics.avgDeliveryWeeks} <span className="text-xs text-slate-500">semanas</span>
            </p>
            <p className="text-[10px] text-slate-400 font-medium">entrega estimada de contratos</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
