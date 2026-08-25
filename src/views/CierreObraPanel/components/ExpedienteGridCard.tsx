/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Historial de Expedientes — el
 * componente genérico (src/components/UI/GridView) no conoce "expedientes";
 * este archivo es el consumidor que decide qué pintar dentro de cada
 * tarjeta, vía la prop `renderCard`.
 */

import { AlertTriangle, FileStack, MapPin } from "lucide-react";
import type { Project } from "../../../types";
import StatusBadge from "../../../components/UI/StatusBadge";

export function renderExpedienteCard(project: Project, rejectionCount: number) {
  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-success-600 whitespace-nowrap">{project.id}</span>
        <StatusBadge code={project.status} className="text-[9px]" />
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{project.title}</div>
        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {project.location}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
          <FileStack className="h-3.5 w-3.5 shrink-0" />
          {project.documents?.length ?? 0}
        </span>
        {rejectionCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {rejectionCount}
          </span>
        )}
      </div>
    </div>
  );
}
