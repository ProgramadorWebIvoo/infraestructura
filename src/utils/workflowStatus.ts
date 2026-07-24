/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflow status utilities — mapping between roles and pending project statuses.
 */
import { ProjectStatus } from "../types";
import type { Project } from "../types";

/**
 * Returns the count of projects that are pending action for a given role,
 * based on their current workflow status.
 */
export function getPendingCount(projects: Project[], role: string): number {
  switch (role) {
    case "CIERRE_DE_OBRA":
      return projects.filter(
        p =>
          p.status === ProjectStatus.CREADO ||
          p.status === ProjectStatus.VERIFICANDO_FINALIZACION,
      ).length;
    case "PROCURA":
      return projects.filter(
        p =>
          p.status === ProjectStatus.REVISADO_CIERRE ||
          p.status === ProjectStatus.COMPARATIVA_ENVIADA,
      ).length;
    case "ANALISTA":
      return projects.filter(
        p => p.status === ProjectStatus.CONFIRMADO_PROCURA,
      ).length;
    case "FINANZAS":
      return projects.filter(
        p =>
          p.status === ProjectStatus.CONTRATADO ||
          p.status === ProjectStatus.LISTO_PAGO_FINAL,
      ).length;
    case "INFRAESTRUCTURA":
    case "MANTENIMIENTO":
      return projects.filter(
        p => p.status === ProjectStatus.EN_EJECUCION,
      ).length;
    case "PRESIDENCIA":
      return projects.length;
    default:
      return 0;
  }
}
