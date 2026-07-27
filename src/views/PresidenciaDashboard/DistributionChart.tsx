/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gráfico de distribución por tipo de obra — extraído de PresidenciaDashboard.
 */

import { motion } from "motion/react";
import { itemVariants } from "../../animations";

function DonutChart({ percent, centerValue, centerLabel }: { percent: number; centerValue: string | number; centerLabel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const gradientId = `donut-grad-${centerLabel.replace(/\s+/g, "")}`;
  return (
    <div className="relative flex w-full items-center justify-center">
      <svg viewBox="0 0 170 170" className="w-full h-auto transform -rotate-90 drop-shadow-sm" role="img" aria-label={`Gráfico de distribución: ${centerLabel} ${centerValue}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        <circle
          cx="85" cy="85" r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
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

interface DistributionChartProps {
  infraCount: number;
  mantCount: number;
}

export default function DistributionChart({ infraCount, mantCount }: DistributionChartProps) {
  const totalTypeCount = infraCount + mantCount || 1;
  const infraPercent = Math.round((infraCount / totalTypeCount) * 100);
  const mantPercent = Math.round((mantCount / totalTypeCount) * 100);

  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1 h-5 rounded-full bg-sky-400" />
        <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">
          Distribución por Tipo de Obra
        </h4>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="w-full max-w-[170px] mx-auto sm:mx-0 shrink-0">
          <DonutChart percent={infraPercent} centerValue={infraCount} centerLabel="Infraestructura" />
        </div>
        <div className="flex-1 space-y-4 w-full border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-8">
          <DistributionBar color="bg-sky-500" label="Infraestructura" count={infraCount} percent={infraPercent} />
          <DistributionBar color="bg-slate-400" label="Mantenimiento" count={mantCount} percent={mantPercent} />
        </div>
      </div>
    </motion.div>
  );
}
