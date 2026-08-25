/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Auditoría de Fin de Obra — el
 * componente genérico (src/components/UI/GridView) no conoce "auditoría";
 * este archivo es el consumidor que decide qué pintar dentro de cada
 * tarjeta, vía la prop `renderCard`.
 */

import { MapPin } from "lucide-react";
import type { Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import StatusBadge from "../../../components/UI/StatusBadge";
import { ProjectTypeBadge } from "./TechnicalReviewPresentational";
import { formatCurrency } from "../../../utils";

export function renderAuditCard(project: Project) {
  const isUnderAudit = project.status === ProjectStatus.VERIFICANDO_FINALIZACION;

  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-success-600 whitespace-nowrap">{project.id}</span>
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
        <StatusBadge
          code={isUnderAudit ? "VERIFICANDO_FINALIZACION" : "EN_EJECUCION"}
          label={isUnderAudit ? "Paso 2 de 2 · Auditoría" : "Paso 1 de 2 · En Curso"}
          className="text-[9px]"
        />
        <span className="font-mono font-bold text-[11px] text-slate-700 whitespace-nowrap">{formatCurrency(project.estimatedTotal)}</span>
      </div>
    </div>
  );
}
