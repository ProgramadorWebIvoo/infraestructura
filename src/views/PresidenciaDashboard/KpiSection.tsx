/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de KPIs de Presidencia — extraída de PresidenciaDashboard.
 */

import { motion } from "motion/react";
import { CheckCircle2, Clock, DollarSign, Layers } from "lucide-react";
import KpiCard from "../../components/UI/KpiCard";
import { itemVariants } from "../../animations";

interface KpiSectionProps {
  totalApprovedInvestment: number;
  totalReleasedFunds: number;
  releasedPercent: number;
  pendingFunds: number;
  totalProjectsCount: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
}

export default function KpiSection({
  totalApprovedInvestment,
  totalReleasedFunds,
  releasedPercent,
  pendingFunds,
  totalProjectsCount,
  activeProjectsCount,
  completedProjectsCount,
}: KpiSectionProps) {
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Presupuesto Aprobado" accent="text-sky-400" borderAccent="border-l-sky-500" variant="dark">
        <span className="text-2xl font-black font-mono bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent">${fmt(totalApprovedInvestment)}</span>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">Inversión autorizada en Base de Datos</p>
      </KpiCard>

      <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Fondos Liquidados" accent="text-sky-600" borderAccent="border-l-sky-400">
        <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">${fmt(totalReleasedFunds)}</span>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-400 to-sky-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${releasedPercent}%` }} />
          </div>
          <span className="text-[10px] font-mono font-bold text-sky-600">{releasedPercent}%</span>
        </div>
      </KpiCard>

      <KpiCard icon={<Clock className="h-5 w-5" />} label="Compromisos Pendientes" accent="text-rose-500" borderAccent="border-l-rose-400">
        <span className="text-2xl font-black font-mono bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent">${fmt(pendingFunds)}</span>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">Fondos retenidos por ejecutar o pagar</p>
      </KpiCard>

      <KpiCard icon={<Layers className="h-5 w-5" />} label="Estado de Proyectos" accent="text-sky-600" borderAccent="border-l-sky-400">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{totalProjectsCount}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Totales</span>
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
    </motion.div>
  );
}
