/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Salud del pipeline: tasa de conversión (creadas → contratadas → pagadas)
 * y cuellos de botella (fases con acumulación de obras sin actividad).
 * El cuello de botella combina VOLUMEN (obras en la fase) con ANTIGÜEDAD
 * (días sin actividad), para no alertar sobre fases recién pobladas.
 */

import { motion } from "motion/react";
import { AlertTriangle, Gauge, GitBranch } from "lucide-react";
import type { DashboardSummary, Project } from "../../types";
import { ProjectStatus } from "../../types";
import { STATUS_LABELS } from "../../utils";
import { STATUS_ORDER, computePipelineHealth, STALLED_THRESHOLD_DAYS } from "../../utils/dashboardSummary";
import { itemVariants } from "../../animations";

interface PipelineHealthSectionProps {
  summary: DashboardSummary;
  projects: Project[];
}

export default function PipelineHealthSection({ summary, projects }: PipelineHealthSectionProps) {
  const { funnel, totalProjects } = summary;

  // ── Tasa de conversión ──
  const countAtOrAfter = (status: string): number => {
    const idx = STATUS_ORDER.indexOf(status);
    if (idx < 0) return 0;
    return funnel
      .filter((f) => STATUS_ORDER.indexOf(f.status) >= idx)
      .reduce((sum, f) => sum + f.count, 0);
  };

  const contracted = countAtOrAfter(ProjectStatus.CONTRATADO);
  const paid = countAtOrAfter(ProjectStatus.COMPLETADO_PAGADO);
  const toContract = totalProjects > 0 ? Math.round((contracted / totalProjects) * 100) : 0;
  const toPaid = totalProjects > 0 ? Math.round((paid / totalProjects) * 100) : 0;
  const contractToPaid = contracted > 0 ? Math.round((paid / contracted) * 100) : 0;

  // ── Cuellos de botella: volumen + antigüedad ──
  const stages = computePipelineHealth(projects);
  const bottlenecks = stages.slice(0, 3);
  const top = bottlenecks[0];

  // Alerta solo si la fase con más obras estancadas supera el umbral de
  // volumen (≥20% del total, mínimo 2) Y tiene al menos una obra estancada.
  const volumeThreshold = Math.max(2, Math.round(totalProjects * 0.2));
  const isConstrained =
    !!top && top.count >= volumeThreshold && top.stalledCount > 0;

  const pctOf = (count: number) =>
    totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-400"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
          <GitBranch className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Salud del Pipeline</h2>
          <p className="text-[11px] text-slate-500 font-medium">Conversión del flujo y fases con acumulación</p>
        </div>
        {isConstrained && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
            <AlertTriangle className="h-3 w-3" />
            Posible cuello de botella
          </span>
        )}
      </div>

      {/* Conversión */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Creación → Contrato</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black font-mono text-indigo-700">{toContract}%</p>
            <span className="text-[10px] text-slate-400 font-bold">{contracted}/{totalProjects} obras</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${toContract}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Creación → Pagado</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black font-mono text-emerald-700">{toPaid}%</p>
            <span className="text-[10px] text-slate-400 font-bold">{paid}/{totalProjects} obras</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${toPaid}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Contrato → Pagado</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-black font-mono text-amber-700">{contractToPaid}%</p>
            <span className="text-[10px] text-slate-400 font-bold">{paid}/{contracted} contratos</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${contractToPaid}%` }} />
          </div>
        </div>
      </div>

      {/* Cuellos de botella */}
      <div className="pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">Fases con Mayor Acumulación</h3>
        </div>

        {bottlenecks.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">Sin obras activas en fases intermedias.</p>
        ) : (
          <div className="space-y-3">
            {bottlenecks.map((b) => (
              <div key={b.status} className="flex items-center gap-3 group">
                <div className="w-44 flex-shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900">{STATUS_LABELS[b.status] ?? b.status}</span>
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-1000 group-hover:scale-y-125 group-hover:origin-bottom ${
                      b.stalledCount > 0 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-sky-400 to-sky-600"
                    }`}
                    style={{ width: `${(b.count / Math.max(1, bottlenecks[0].count)) * 100}%` }}
                  />
                </div>
                <div className="flex items-baseline gap-1.5 w-44 justify-end shrink-0 text-right">
                  <span className="text-sm font-black font-mono text-slate-800">{b.count}</span>
                  <span className="text-[10px] text-slate-400 font-bold">obras · {pctOf(b.count)}%</span>
                </div>
                <div className="hidden lg:flex flex-col items-end shrink-0 w-32 text-right">
                  {b.stalledCount > 0 ? (
                    <>
                      <span className="text-[10px] font-mono font-bold text-amber-600">{b.stalledCount} estancada(s)</span>
                      <span className="text-[9px] text-slate-400 font-medium">hasta {b.maxDaysSinceUpdate}d sin actividad</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-slate-400">sin estancadas</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-3">
          Se alerta un cuello de botella cuando una fase concentra ≥{Math.max(2, Math.round(totalProjects * 0.2))} obras
          ({Math.round(Math.max(2, Math.round(totalProjects * 0.2)) / Math.max(1, totalProjects) * 100)}% del total) y al menos una lleva
          {STALLED_THRESHOLD_DAYS}+ días sin actividad. Las barras ámbar indican fases con obras estancadas.
        </p>
      </div>
    </motion.div>
  );
}