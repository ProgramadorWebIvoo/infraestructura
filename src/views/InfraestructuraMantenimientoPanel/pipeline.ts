/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Etapas canónicas del flujo de una petición creada en
 * Infraestructura / Mantenimiento, con helpers de conteo y filtrado.
 * Fuente única para el pipeline del departamento y los filtros de la lista.
 */

import { Calculator, CheckCircle2, DollarSign, FilePlus2, HardHat, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";

export interface PipelineStage {
  key: string;
  label: string;
  description: string;
  /** Estados de ProjectStatus que caen en esta etapa */
  statuses: readonly string[];
  icon: LucideIcon;
  /** Clases del chip de icono */
  color: string;
  /** Clases del botón activo */
  active: string;
}

// Excepción intencional a la migración a SEMANTIC_COLOR_MAP: son 6 etapas
// secuenciales sin rol de estado (éxito/error/etc), no hay 6 roles semánticos
// que mapeen 1:1 sin perder la distinción visual entre etapas.
export const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    key: "creadas",
    label: "Creadas",
    description: "Enviadas a Cierre",
    statuses: [ProjectStatus.CREADO],
    icon: FilePlus2,
    color: "bg-sky-50 text-sky-600 border-sky-100",
    active: "border-sky-500 bg-sky-50 text-sky-700 shadow-sm shadow-sky-200/50",
  },
  {
    key: "cierre",
    label: "Cierre de Obra",
    description: "Revisión técnica",
    statuses: [ProjectStatus.REVISADO_CIERRE],
    icon: Calculator,
    color: "bg-blue-50 text-blue-600 border-blue-100",
    active: "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-200/50",
  },
  {
    key: "procura",
    label: "Procura",
    description: "Ofertas y adjudicación",
    statuses: [ProjectStatus.CONFIRMADO_PROCURA, ProjectStatus.COMPARATIVA_ENVIADA],
    icon: Scale,
    color: "bg-purple-50 text-purple-600 border-purple-100",
    active: "border-purple-500 bg-purple-50 text-purple-700 shadow-sm shadow-purple-200/50",
  },
  {
    key: "finanzas",
    label: "Finanzas",
    description: "Anticipo y liquidación",
    statuses: [ProjectStatus.CONTRATADO, ProjectStatus.LISTO_PAGO_FINAL],
    icon: DollarSign,
    color: "bg-rose-50 text-rose-600 border-rose-100",
    active: "border-rose-500 bg-rose-50 text-rose-700 shadow-sm shadow-rose-200/50",
  },
  {
    key: "ejecucion",
    label: "Ejecución",
    description: "Obra en curso / auditoría",
    statuses: [ProjectStatus.EN_EJECUCION, ProjectStatus.VERIFICANDO_FINALIZACION],
    icon: HardHat,
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
    active: "border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm shadow-cyan-200/50",
  },
  {
    key: "completadas",
    label: "Completadas",
    description: "Pagadas y cerradas",
    statuses: [ProjectStatus.COMPLETADO_PAGADO],
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    active: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-200/50",
  },
];

export function stageOf(status: string): string | undefined {
  return PIPELINE_STAGES.find((s) => s.statuses.includes(status))?.key;
}

export function countByStage(projects: Project[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of PIPELINE_STAGES) counts[s.key] = 0;
  for (const p of projects) {
    const key = stageOf(p.status);
    if (key) counts[key] += 1;
  }
  return counts;
}

export function filterByStage(projects: Project[], stageKey: string): Project[] {
  if (stageKey === "todas") return projects;
  return projects.filter((p) => stageOf(p.status) === stageKey);
}
