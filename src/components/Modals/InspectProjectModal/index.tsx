/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de proyecto — expediente completo de la obra:
 *  - Estado actual + metadata
 *  - Snapshot financiero (estimado, aprobado, contrato, anticipo, liquidación)
 *  - Flujo de decisiones (Organigrama IVOO) con avance por rol
 *  - Trazabilidad paso a paso del workflow (8 etapas, datos completos)
 *
 * Orquestador delgado: cada sección vive en su propio archivo
 * (FinancialSnapshot/ProjectOrganigrama/WorkflowTimeline) — este componente
 * solo compone las tres junto con la metadata de cabecera.
 */

import { Building2, Calendar, MapPin } from "lucide-react";
import { ProjectStatus } from "../../../types";
import type { Project } from "../../../types";
import Modal from "../../UI/Modal";
import EmptyState from "../../UI/EmptyState";
import StatusBadge from "../../UI/StatusBadge";
import { daysBetween } from "../../../utils/dashboardSummary";
import FinancialSnapshot from "./FinancialSnapshot";
import ProjectOrganigrama from "./ProjectOrganigrama";
import WorkflowTimeline from "./WorkflowTimeline";

interface InspectProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
}

export default function InspectProjectModal({ isOpen, project, onClose }: InspectProjectModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      badge="Expediente de Obra"
      title={project?.title ?? ""}
      infoLine={project ? `${project.id} • ${project.type}` : undefined}
      icon={<Building2 className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end">
          <button
            id="btn-close-inspect-footer"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      }
    >
      {!project ? (
        <EmptyState message="Proyecto no disponible." />
      ) : (
        <>
          {/* Metadata + estado actual */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusBadge code={project.status} className="text-sm font-bold px-2.5 py-1" />
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {project.location}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              Apertura {project.createdDate}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              hace {daysBetween(project.createdDate)}d
              {project.updatedAt ? ` · act. ${new Date(project.updatedAt).toLocaleDateString("en-US")}` : ""}
            </span>
          </div>

          <FinancialSnapshot project={project} />

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-sky-500" />
              Flujo de Decisiones Organigrama IVOO
            </h3>
            <p className="text-xs text-slate-500 mb-3 font-medium">
              Posición actual del proyecto en el flujo del sistema.
              {project.status === ProjectStatus.EN_EJECUCION
                ? " La obra se encuentra en ejecución bajo supervisión."
                : project.status === ProjectStatus.COMPLETADO_PAGADO
                  ? " Ciclo cerrado: obra entregada y liquidada."
                  : ""}
            </p>
            <ProjectOrganigrama project={project} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <WorkflowTimeline project={project} />
          </div>
        </>
      )}
    </Modal>
  );
}
