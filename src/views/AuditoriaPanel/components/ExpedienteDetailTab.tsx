/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Detalle Expediente" del modal de Historial de Expedientes — split
 * card: descripción/materiales/observaciones a la izquierda (contenido
 * principal), metadatos de contexto a la derecha (sidebar), en vez del
 * bloque único apilado que tenía el modal antes de las tabs.
 */

import { AlertTriangle, Calendar, HardHat, MapPin, Package } from "lucide-react";
import type { Project } from "@/types";
import StatusBadge from "@/components/UI/StatusBadge";
import Button from "@/components/UI/Button";
import { canChangeProjectResident, canResendClosureLink } from "@/utils/projectLocation";

interface ExpedienteDetailTabProps {
  project: Project;
  rejectionCount: number;
  /** Opens the "Cambiar residente" flow (custom-location works only, D14). */
  onChangeResident?: (project: Project) => void;
  /** Resends the contractor closure link (D16); shown while Auditoría hasn't verified the closure yet. */
  onResendLink?: (project: Project) => void;
  isResendingLink?: boolean;
}

export default function ExpedienteDetailTab({ project, rejectionCount, onChangeResident, onResendLink, isResendingLink }: ExpedienteDetailTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-3">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2.5">
          <p className="text-[11px] text-slate-600 leading-relaxed">{project.description}</p>

          {project.materials.length > 0 && (
            <div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                <Package className="h-3 w-3 shrink-0" />
                Materiales ({project.materials.length})
              </span>
              <ul className="text-[11px] text-slate-600 space-y-0.5">
                {project.materials.map((m, i) => (
                  <li key={m.id ?? i} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{m.name}</span>
                    <span className="shrink-0 font-mono text-slate-400">{m.quantity} {m.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.auditNotes && (
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Observaciones de Auditoría
              </span>
              <p className="text-[11px] text-slate-600 whitespace-pre-line">{project.auditNotes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2.5">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</span>
            <StatusBadge code={project.status} />
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <MapPin className="h-3 w-3 shrink-0" />
              Ubicación
            </span>
            <p className="text-[11px] text-slate-600">{project.location}</p>
            <p className="text-[10px] font-medium text-slate-400">{project.localizationId ? "Ubicación registrada" : "Ubicación personalizada"}</p>
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <HardHat className="h-3 w-3 shrink-0" />
              Residente
            </span>
            <p className="text-[11px] text-slate-600">{project.residentName ?? "Sin asignar"}</p>
            {onChangeResident && canChangeProjectResident(project) && (
              <Button size="sm" className="mt-1.5" onClick={() => onChangeResident(project)}>
                Cambiar residente
              </Button>
            )}
            {onResendLink && canResendClosureLink(project) && (
              <Button size="sm" variant="secondary" className="mt-1.5 ml-1.5" isLoading={isResendingLink} onClick={() => onResendLink(project)}>
                Reenviar enlace al contratista
              </Button>
            )}
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <Calendar className="h-3 w-3 shrink-0" />
              Apertura
            </span>
            <p className="text-[11px] text-slate-600">{project.createdDate}</p>
          </div>
          {rejectionCount > 0 && (
            <div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-danger-600 uppercase tracking-wider mb-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Rechazos
              </span>
              <p className="text-[11px] font-bold text-danger-600">{rejectionCount}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
