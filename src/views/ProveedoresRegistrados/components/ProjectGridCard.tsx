/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en la vista de Propuestas de Materiales.
 * El componente genérico GridView no conoce sobre proyectos, este archivo
 * decide qué pintar dentro de cada tarjeta.
 */

import { Package, TrendingUp } from "lucide-react";

interface ProjectProposalSummary {
  projectId: string;
  projectTitle: string;
  proposalCount: number;
  totalAmount: number;
  latestProposalDate: string;
}

export function renderProjectGridCard(project: ProjectProposalSummary) {
  return (
    <div className="flex flex-col h-full p-3.5 gap-3">
      {/* Header */}
      <div className="flex-shrink-0">
        <span className="inline-block rounded-lg border border-sky-200 bg-linear-to-br from-sky-50 to-sky-100/50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">
          {project.projectId}
        </span>
      </div>

      {/* Title */}
      <div className="flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-800 line-clamp-2">{project.projectTitle}</h3>
      </div>

      {/* Stats */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-0">
        <div className="flex items-start gap-2">
          <Package className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Propuestas</span>
            <p className="text-sm font-black text-indigo-700">{project.proposalCount}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monto Total</span>
            <p className="text-sm font-black text-emerald-700">
              ${project.totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pt-2 border-t border-slate-100">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Última actualización</span>
        <p className="text-xs font-semibold text-slate-600">{project.latestProposalDate}</p>
      </div>
    </div>
  );
}
