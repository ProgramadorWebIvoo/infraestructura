/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helper compartido para contar/detectar rechazos de expediente a partir de
 * AuditLog — antes duplicado (misma constante y misma lógica de conteo) en
 * RevisedDocumentsSection.tsx y ProjectIterationsTimeline.tsx.
 */

import type { AuditLog } from "../../../types";

export const REJECTION_ACTION = "Rechazo de petición de obra";

export function rejectionCountOf(projectId: string, auditLogs: AuditLog[]): number {
  return auditLogs.filter((l) => l.projectId === projectId && l.action === REJECTION_ACTION).length;
}
