/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de KPIs de Presidencia — extraída de PresidenciaDashboard.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock, DollarSign, Layers, TrendingUp, AlertTriangle } from "lucide-react";
import KpiCard from "../../components/UI/KpiCard";
import { itemVariants } from "../../animations";
import KpiDetailModal, { type KpiKind } from "./KpiDetailModal";
import type { DashboardSummary, Project } from "../../types";

interface KpiSectionProps {
  summary: DashboardSummary;
  projects: Project[];
  totalApprovedInvestment: number;
  totalReleasedFunds: number;
  releasedPercent: number;
  pendingFunds: number;
  excessReleased?: number;
  totalProjectsCount: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
}

export default function KpiSection({
  summary,
  projects,
  totalApprovedInvestment,
  totalReleasedFunds,
  releasedPercent,
  pendingFunds,
  excessReleased = 0,
  totalProjectsCount,
  activeProjectsCount,
  completedProjectsCount,
}: KpiSectionProps) {
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const overBudget = excessReleased > 0;
  const barWidth = Math.min(100, releasedPercent);
  const [inspecting, setInspecting] = useState<KpiKind>(null);
  const activePct = totalProjectsCount > 0 ? Math.round((activeProjectsCount / totalProjectsCount) * 100) : 0;
  const completedPct = totalProjectsCount > 0 ? Math.round((completedProjectsCount / totalProjectsCount) * 100) : 0;

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Presupuesto Aprobado" accent="text-sky-400" borderAccent="border-l-sky-500" variant="dark" onInspect={() => setInspecting("approved")}>
        <span className="text-2xl font-black font-mono bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent">${fmt(totalApprovedInvestment)}</span>
        <div className="flex items-center gap-1.5 mt-2">
          <TrendingUp className="h-3 w-3 text-sky-400" />
          <p className="text-[10px] text-slate-400 font-medium">Inversión autorizada en {totalProjectsCount} proyectos</p>
        </div>
      </KpiCard>

      <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Fondos Liquidados" accent={overBudget ? "text-rose-400" : "text-sky-600"} borderAccent={overBudget ? "border-l-rose-400" : "border-l-sky-400"} onInspect={() => setInspecting("released")}>
        <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">${fmt(totalReleasedFunds)}</span>
        {overBudget ? (
          <div className="flex items-center gap-1.5 mt-2.5 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 w-fit">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span className="text-[10px] font-mono font-bold text-rose-600">
              +${fmt(excessReleased)} sobre lo aprobado
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 to-sky-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${barWidth}%` }} />
            </div>
            <span className="text-[10px] font-mono font-bold text-sky-600 shrink-0">{releasedPercent}% ejecutado</span>
          </div>
        )}
      </KpiCard>

      <KpiCard icon={<Clock className="h-5 w-5" />} label="Compromisos Pendientes" accent="text-rose-500" borderAccent="border-l-rose-400" onInspect={() => setInspecting("pending")}>
        <span className="text-2xl font-black font-mono bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent">${fmt(pendingFunds)}</span>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <p className="text-[10px] text-slate-400 font-medium">Retenido por ejecutar o pagar</p>
        </div>
      </KpiCard>

      <KpiCard icon={<Layers className="h-5 w-5" />} label="Estado de Proyectos" accent="text-sky-600" borderAccent="border-l-sky-400" onInspect={() => setInspecting("projects")}>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{totalProjectsCount}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Totales</span>
        </div>
        <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-slate-100 mt-2.5">
          <div className="bg-sky-400 h-full transition-all duration-1000" style={{ width: `${activePct}%` }} />
          <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${completedPct}%` }} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs shadow-sky-400/40" /> {activeProjectsCount} Activos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" /> {completedProjectsCount} Pagados
          </span>
        </div>
      </KpiCard>

      <KpiDetailModal
        kind={inspecting}
        onClose={() => setInspecting(null)}
        summary={summary}
        projects={projects}
        totalProjectsCount={totalProjectsCount}
        activeProjectsCount={activeProjectsCount}
        completedProjectsCount={completedProjectsCount}
      />
    </motion.div>
  );
}
