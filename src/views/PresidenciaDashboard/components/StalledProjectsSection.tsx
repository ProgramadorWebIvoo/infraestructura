/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Listado accionable de obras estancadas (summary.stalledProjects) — a
 * diferencia de PipelineHealthSection (que solo agrega por fase), aquí
 * Presidencia ve cada obra puntual y puede inspeccionarla directamente,
 * sin pasar por Master de Obras a buscarla manualmente.
 */

import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, Clock3 } from "lucide-react";
import type { DashboardSummaryStalledEntry, Project } from "@/types";
import StatusBadge from "@/components/UI/StatusBadge";
import EmptyState from "@/components/UI/EmptyState";
import { STALLED_THRESHOLD_DAYS } from "@/utils/dashboardSummary";
import { itemVariants } from "@/animations";

interface StalledProjectsSectionProps {
  stalledProjects: DashboardSummaryStalledEntry[];
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export default function StalledProjectsSection({ stalledProjects, projects, onSelectProject }: StalledProjectsSectionProps) {
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-400"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Obras Estancadas</h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Sin actividad hace {STALLED_THRESHOLD_DAYS}+ días, no cerradas — top {stalledProjects.length}
          </p>
        </div>
        {stalledProjects.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
            {stalledProjects.length} obra(s)
          </span>
        )}
      </div>

      {stalledProjects.length === 0 ? (
        <EmptyState message="Ninguna obra activa lleva días sin actividad reciente." />
      ) : (
        <div className="space-y-2">
          {stalledProjects.map((entry) => {
            const project = projectsById.get(entry.id);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-amber-50/50 hover:border-amber-100 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-sans font-bold text-slate-800 text-sm line-clamp-1">{entry.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-sky-600 font-bold">{entry.id}</span>
                    <StatusBadge code={entry.status} />
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-amber-600 shrink-0">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-mono font-bold">{entry.daysSinceUpdate}d sin actividad</span>
                </div>

                <button
                  id={`btn-inspect-stalled-${entry.id}`}
                  onClick={() => project && onSelectProject(project)}
                  disabled={!project}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Inspeccionar
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
