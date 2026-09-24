/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pestaña "Flujo y organigrama" del detalle del Histórico: posición actual de
 * la obra en el organigrama de decisiones IVOO y su trazabilidad paso a paso.
 * Reutiliza ProjectOrganigrama y WorkflowTimeline (misma fuente que el resto
 * de la app: el objeto Project ya cargado en la sesión).
 */

import { Building2 } from "lucide-react";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";
import EmptyState from "@/components/UI/EmptyState";
import ProjectOrganigrama from "@/components/Modals/InspectProjectModal/ProjectOrganigrama";
import WorkflowTimeline from "@/components/Modals/InspectProjectModal/WorkflowTimeline";

export default function HistoryFlowPanel({ project }: { project: Project | undefined }) {
  if (!project) {
    return <EmptyState message="El flujo de esta obra aún no está disponible en la sesión. Actualiza la página e inténtalo de nuevo." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-sky-500" aria-hidden="true" />
          Flujo de Decisiones Organigrama IVOO
        </h3>
        <p className="text-xs text-slate-500 mb-3 font-medium">
          Posición actual de la obra en el flujo del sistema.
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
    </div>
  );
}
