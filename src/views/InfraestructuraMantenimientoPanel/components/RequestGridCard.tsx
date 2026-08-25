/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Expedientes (Infraestructura) — el
 * componente genérico (src/components/UI/GridView) no conoce "peticiones";
 * este archivo es el consumidor que decide qué pintar dentro de cada
 * tarjeta, vía la prop `renderCard`.
 */

import { Eye, MapPin } from "lucide-react";
import type { Project } from "../../../types";
import StatusBadge from "../../../components/UI/StatusBadge";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { formatCurrency } from "../../../utils";

function TypeBadge({ type }: { type: Project["type"] }) {
  const c = SEMANTIC_COLOR_MAP[type === "INFRAESTRUCTURA" ? "brand" : "neutral"];
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${c.bg50} ${c.text700} ${c.border100}`}>
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

export function renderRequestCard(project: Project, onInspect: (p: Project) => void) {
  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-sky-600 whitespace-nowrap">{project.id}</span>
        <div className="flex items-center gap-1.5">
          <TypeBadge type={project.type} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(project);
            }}
            aria-label={`Inspeccionar ${project.title}`}
            className="inline-flex items-center justify-center p-1 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{project.title}</div>
        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {project.location}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <StatusBadge code={project.status} className="text-[9px]" />
        <span className="font-mono font-bold text-[11px] text-slate-700 whitespace-nowrap">{formatCurrency(project.estimatedTotal)}</span>
      </div>
    </div>
  );
}
