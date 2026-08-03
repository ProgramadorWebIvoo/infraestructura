/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resumen financiero agregado del departamento: donut de progreso de fondos
 * liberados vs presupuesto aprobado + métricas claras (aprobado, comprometido,
 * liberado, pendiente) + indicadores de negociación (anticipo y plazo promedio).
 */

import { motion } from "motion/react";
import { Wallet, HandCoins, CalendarClock, AlertTriangle, TrendingUp, Lock, CircleDollarSign } from "lucide-react";
import type { Project } from "../../types";
import { itemVariants } from "../../animations";
import { computeDashboardSummary } from "../../utils/dashboardSummary";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Donut de progreso: un solo anillo que muestra el % liberado del presupuesto. */
function ProgressDonut({ percent, centerValue, centerLabel }: { percent: number; centerValue: string; centerLabel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const len = (clamped / 100) * circumference;

  return (
    <div className="relative flex w-full items-center justify-center">
      <svg viewBox="0 0 170 170" className="w-full h-auto transform -rotate-90 drop-shadow-sm" role="img" aria-label={`Progreso de fondos liberados: ${clamped}%`}>
        <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        <circle
          cx="85" cy="85" r={radius} fill="none"
          stroke="url(#progressGradient)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${len} ${circumference - len}`}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-slate-800 font-mono">{centerValue}</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase font-sans">{centerLabel}</span>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  amount: number;
  sub: string;
  accent: string;
  iconBg: string;
}

function MetricCard({ icon, label, amount, sub, accent, iconBg }: MetricCardProps) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <p className={`text-lg font-black font-mono ${accent}`}>${fmtMoney(amount)}</p>
      <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
    </div>
  );
}

interface FinancialSummarySectionProps {
  projects: Project[];
}

export default function FinancialSummarySection({ projects }: FinancialSummarySectionProps) {
  const summary = computeDashboardSummary(projects);
  const { totalApprovedInvestment, totalCommittedAmount, totalReleasedFunds, pendingFunds, excessReleased } = summary;
  const base = totalApprovedInvestment || 1;
  const releasedPct = Math.min(100, (totalReleasedFunds / base) * 100);
  const committedPct = Math.min(100, (totalCommittedAmount / base) * 100);
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
          <h2 className="font-bold text-slate-900 text-sm">Ejecución Financiera del Portafolio</h2>
          <p className="text-[11px] text-slate-500 font-medium">Fondos liberados vs presupuesto aprobado</p>
        </div>
        {overBudget && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
            <AlertTriangle className="h-3 w-3" />
            Sobre-ejecución ${fmtMoney(excessReleased)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Donut de progreso */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-full max-w-[170px]">
            <ProgressDonut
              percent={releasedPct}
              centerValue={`${Math.round(releasedPct)}%`}
              centerLabel="Liberado"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
            {overBudget
              ? "Los fondos liberados superan el presupuesto aprobado."
              : `Se ha liberado ${Math.round(releasedPct)}% del presupuesto aprobado.`}
          </p>
        </div>

        {/* Métricas claras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:col-span-2">
          <MetricCard
            icon={<CircleDollarSign className="h-4 w-4 text-sky-600" />}
            iconBg="bg-sky-50"
            label="Presupuesto Aprobado"
            amount={totalApprovedInvestment}
            sub="Referencia del total (100%)"
            accent="text-sky-700"
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4 text-indigo-600" />}
            iconBg="bg-indigo-50"
            label="Comprometido"
            amount={totalCommittedAmount}
            sub={`${Math.round(committedPct)}% del presupuesto aprobado`}
            accent="text-indigo-700"
          />
          <MetricCard
            icon={<Wallet className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Fondos Liberados"
            amount={totalReleasedFunds}
            sub={overBudget ? "Excede lo aprobado" : `${Math.round(releasedPct)}% del presupuesto aprobado`}
            accent="text-emerald-700"
          />
          <MetricCard
            icon={<Lock className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Pendiente por Ejecutar"
            amount={pendingFunds}
            sub={overBudget ? "No hay pendiente" : `${Math.round(pendingPct)}% del presupuesto aprobado`}
            accent="text-amber-700"
          />
        </div>
      </div>

      {/* Indicadores de negociación */}
      <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <HandCoins className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Anticipo Promedio</span>
          </div>
          <p className="text-xl font-black font-mono text-slate-800">{summary.negotiationMetrics.avgAdvancePercent}%</p>
          <p className="text-[10px] text-slate-400 font-medium">sobre propuestas adjudicadas</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Plazo Promedio</span>
          </div>
          <p className="text-xl font-black font-mono text-slate-800">
            {summary.negotiationMetrics.avgDeliveryWeeks} <span className="text-xs text-slate-500">semanas</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">entrega estimada de contratos</p>
        </div>
      </div>
    </motion.div>
  );
}