/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Distribución por tipo de obra: donut de conteo + barras de participación,
 * y debajo la dimensión monetaria (presupuesto aprobado por tipo) para
 * aprovechar la altura de la card gemela de Ejecución Financiera.
 */

import { motion } from "motion/react";
import { Layers, Wallet } from "lucide-react";
import type { DashboardSummary } from "../../types";
import { itemVariants } from "../../animations";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Segment {
  value: number;
  color: string;
}

function DonutChart({ segments, centerValue, centerLabel }: { segments: Segment[]; centerValue: string | number; centerLabel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const len = (seg.value / total) * circumference;
    const arc = { ...seg, len, offset };
    offset += len;
    return arc;
  });

  return (
    <div className="relative flex w-full items-center justify-center">
      <svg viewBox="0 0 170 170" className="w-full h-auto transform -rotate-90 drop-shadow-sm" role="img" aria-label={`Gráfico de distribución: ${centerLabel} ${centerValue}`}>
        <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {arcs.map((arc) => (
          <circle
            key={arc.color}
            cx="85" cy="85" r={radius} fill="none"
            stroke={arc.color} strokeWidth="14"
            strokeDasharray={`${arc.len} ${circumference - arc.len}`}
            strokeDashoffset={-arc.offset}
            className="transition-all duration-1000 ease-out"
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-slate-800 font-mono">{centerValue}</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase font-sans">{centerLabel}</span>
      </div>
    </div>
  );
}

function DistributionBar({ color, label, count, percent }: { color: string; label: string; count: number; percent: number }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <span className={`w-3 h-3 rounded ${color} flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform duration-200`} />
        <span className="text-xs text-slate-600 font-bold group-hover:text-slate-900 transition-colors duration-200">{label}</span>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-1000 group-hover:scale-y-125 group-hover:origin-bottom`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-mono font-black text-slate-800 whitespace-nowrap w-20 text-right group-hover:text-slate-900 transition-colors duration-200">{count} ({percent}%)</span>
    </div>
  );
}

/** Fila de monto aprobado por tipo, barra proporcional al máximo del grupo. */
function AmountBar({ color, label, amount, total }: { color: string; label: string; amount: number; total: number }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 group">
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <span className={`w-3 h-3 rounded ${color} flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform duration-200`} />
        <span className="text-xs text-slate-600 font-bold group-hover:text-slate-900 transition-colors duration-200">{label}</span>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-1000 group-hover:scale-y-125 group-hover:origin-bottom`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-black text-slate-800 whitespace-nowrap text-right group-hover:text-slate-900 transition-colors duration-200">
        ${fmtMoney(amount)}
      </span>
    </div>
  );
}

interface DistributionChartProps {
  summary: DashboardSummary;
}

export default function DistributionChart({ summary }: DistributionChartProps) {
  const infra = summary.typeBreakdown.find((t) => t.type === "INFRAESTRUCTURA");
  const mant = summary.typeBreakdown.find((t) => t.type === "MANTENIMIENTO");
  const infraCount = infra?.count ?? 0;
  const mantCount = mant?.count ?? 0;
  const infraAmount = infra?.approvedAmount ?? 0;
  const mantAmount = mant?.approvedAmount ?? 0;

  const totalTypeCount = infraCount + mantCount;
  const totalApprovedByType = infraAmount + mantAmount;
  const infraPercent = totalTypeCount > 0 ? Math.round((infraCount / totalTypeCount) * 100) : 0;
  const mantPercent = totalTypeCount > 0 ? Math.round((mantCount / totalTypeCount) * 100) : 0;

  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
          <Layers className="h-4 w-4 text-sky-500" />
        </div>
        <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">
          Distribución por Tipo de Obra
        </h4>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="w-full max-w-[170px] mx-auto sm:mx-0 shrink-0">
          <DonutChart
            segments={[
              { value: infraCount, color: "#0ea5e9" },
              { value: mantCount, color: "#94a3b8" },
            ]}
            centerValue={totalTypeCount}
            centerLabel="Obras"
          />
        </div>
        <div className="flex-1 space-y-4 w-full border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-8">
          <DistributionBar color="bg-sky-500" label="Infraestructura" count={infraCount} percent={infraPercent} />
          <DistributionBar color="bg-slate-400" label="Mantenimiento" count={mantCount} percent={mantPercent} />
        </div>
      </div>

      {/* Inversión por tipo: llena la altura de la card gemela con valor ejecutivo */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-slate-400" />
          <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">
            Inversión por Tipo
          </h4>
        </div>
        <div className="space-y-4">
          <AmountBar color="bg-sky-500" label="Infraestructura" amount={infraAmount} total={totalApprovedByType} />
          <AmountBar color="bg-slate-400" label="Mantenimiento" amount={mantAmount} total={totalApprovedByType} />
        </div>
      </div>
    </motion.div>
  );
}
