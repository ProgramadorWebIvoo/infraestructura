/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Revisión de Cálculos y Planos
 * (Cierre de Obra) — el componente genérico (src/components/UI/GridView) no
 * conoce "peticiones"; este archivo es el consumidor que decide qué pintar
 * dentro de cada tarjeta, vía la prop `renderCard`.
 */

import { Layers, MapPin } from "lucide-react";
import type { Project } from "../../../types";
import { formatNumber } from "../../../utils";
import { ProjectTypeBadge } from "./TechnicalReviewPresentational";

export function renderTechnicalReviewCard(project: Project) {
  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-brand-600 whitespace-nowrap">{project.id}</span>
        <ProjectTypeBadge type={project.type} />
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{project.title}</div>
        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {project.location}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-400">{project.createdDate}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            {project.materials.length}
          </span>
        </div>
        <span className="font-mono font-bold text-[11px] text-slate-800 whitespace-nowrap">${formatNumber(project.estimatedTotal)}</span>
      </div>
    </div>
  );
}
