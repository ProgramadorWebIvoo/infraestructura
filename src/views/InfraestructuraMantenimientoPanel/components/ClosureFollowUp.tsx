/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seguimiento del cierre posterior a la ejecución, solo lectura, para el
 * creador de la solicitud (F2-R D8): no aprueba nada, solo ve dónde está la obra.
 */

import { CheckCircle2, Circle, HardHat } from "lucide-react";
import type { Project } from "@/types";
import { ProjectStatus } from "@/types";

const STEPS: { status: string; label: string }[] = [
  { status: ProjectStatus.EN_EJECUCION, label: "En ejecución (informe del contratista)" },
  { status: ProjectStatus.INFORME_ENVIADO, label: "Verificación del residente" },
  { status: ProjectStatus.VERIFICANDO_FINALIZACION, label: "Revisión de Auditoría" },
  { status: ProjectStatus.PENDIENTE_SOLICITUD_FINIQUITO, label: "Solicitud de finiquito (Procura)" },
  { status: ProjectStatus.LISTO_PAGO_FINAL, label: "Pago final (Finanzas)" },
  { status: ProjectStatus.COMPLETADO_PAGADO, label: "Completada y pagada" },
];

/** Índice del paso actual del cierre, o -1 si la obra aún no llegó a la ejecución. */
export function closureStepIndex(status: string): number {
  return STEPS.findIndex((step) => step.status === status);
}

export default function ClosureFollowUp({ project }: { project: Project }) {
  const current = closureStepIndex(project.status);
  if (current < 0) return null;

  return (
    <section>
      <h4 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
        <HardHat className="h-3.5 w-3.5" />
        Seguimiento del cierre
      </h4>
      <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-[11px] text-slate-500">
          Residente: <span className="font-semibold text-slate-700">{project.residentName ?? "Sin asignar"}</span>
        </p>
        <ol className="space-y-1.5">
          {STEPS.map((step, index) => {
            const done = index < current || project.status === ProjectStatus.COMPLETADO_PAGADO;
            const active = index === current && !done;
            return (
              <li key={step.status} className={`flex items-center gap-2 text-xs ${active ? "font-bold text-sky-700" : done ? "text-slate-600" : "text-slate-400"}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className={`h-3.5 w-3.5 ${active ? "text-sky-500" : ""}`} />}
                {step.label}
              </li>
            );
          })}
        </ol>
        {project.closureReportStatus === "RECHAZADO" && <p className="text-[11px] font-medium text-amber-700">El informe fue devuelto y está en corrección.</p>}
      </div>
    </section>
  );
}
