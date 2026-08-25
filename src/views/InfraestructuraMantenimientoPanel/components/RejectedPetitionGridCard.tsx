/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Expedientes Rechazados
 * (Infraestructura) — el componente genérico (src/components/UI/GridView)
 * no conoce "peticiones rechazadas"; este archivo es el consumidor que
 * decide qué pintar dentro de cada tarjeta, vía la prop `renderCard`.
 */

import { Eye, MapPin, Pencil } from "lucide-react";
import type { AuditLog, Project } from "../../../types";

interface RejectedRow {
  project: Project;
  log?: AuditLog;
}

export function renderRejectedPetitionCard(
  { project: p, log }: RejectedRow,
  onView: (p: Project) => void,
  onResubmit: (p: Project) => void,
) {
  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-danger-600 whitespace-nowrap">{p.id}</span>
        <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">{log?.timestamp ?? "—"}</span>
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{p.title}</div>
        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {p.location}
        </div>
      </div>

      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 min-h-[2.2em]">
        {log ? log.details : <span className="text-slate-400 italic">Motivo no disponible.</span>}
      </p>

      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView(p);
          }}
          aria-label={`Ver petición ${p.title}`}
          title="Ver petición"
          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResubmit(p);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-danger-700 bg-white border border-danger-200 hover:bg-danger-500 hover:text-white hover:border-danger-500 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar y reenviar
        </button>
      </div>
    </div>
  );
}
