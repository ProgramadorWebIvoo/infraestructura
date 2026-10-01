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
import ProductLinesTable from "@/components/UI/ProductLinesTable";

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
              <ProductLinesTable
                ariaLabel="Materiales del expediente"
                items={project.materials}
                rowKey={(m, i) => m.id ?? i}
                pageSize={8}
                maxHeight="16rem"
                searchText={(m) => m.name}
                searchPlaceholder="Buscar material…"
                columns={[
                  { key: "name", label: "Material", className: "text-[11px] text-slate-600", render: (m) => <span className="block max-w-xs truncate" title={m.name}>{m.name}</span> },
                  { key: "quantity", label: "Cantidad", align: "right", className: "whitespace-nowrap font-mono text-[11px] text-slate-500", render: (m) => `${m.quantity} ${m.unit}` },
                ]}
              />
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
            <StatusBadge code={project.status} returnInfo={project.returnInfo} />
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
                Reenviar enlace al proveedor
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
