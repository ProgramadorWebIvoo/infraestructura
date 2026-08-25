/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Autorización de Inversión Inicial
 * (Procura) — el componente genérico (src/components/UI/GridView) no conoce
 * "peticiones"; este archivo es el consumidor que decide qué pintar dentro
 * de cada tarjeta, vía la prop `renderCard`.
 */

import { MapPin } from "lucide-react";
import type { Project } from "../../../types";
import { formatNumber } from "../../../utils";

function TypeBadge({ type }: { type: Project["type"] }) {
  return (
    <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

export function renderInvestmentApprovalCard(project: Project) {
  return (
    <div className="p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold text-brand-600">{project.id}</span>
        <TypeBadge type={project.type} />
      </div>
      <div className="text-xs font-bold text-slate-800 line-clamp-1">{project.title}</div>
      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0" />
        {project.location}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[10px] font-mono font-bold text-slate-400">{project.createdDate}</span>
        <span className="font-mono font-bold text-brand-700">${formatNumber(project.estimatedTotal)}</span>
      </div>
    </div>
  );
}
