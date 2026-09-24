/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definición de columnas y filas del export del Histórico de Obras
 * (CSV / Excel / PDF vía ExportButton).
 */

import { STATUS_LABELS } from "@ivoo/shared";
import type { ExportColumn, ExportRow } from "@/components/UI/ExportButton";
import type { ProjectHistoryRow } from "./projectHistoryTypes";

export const HISTORY_EXPORT_HEADERS = [
  "Código", "Obra", "Tipo", "Ubicación", "Estado", "Creada",
  "Estimado", "Aprobado", "Adjudicado", "Ejecutado", "% Ejecución",
  "Proveedor", "Rating", "Alertas",
];

export const HISTORY_EXPORT_COLUMNS: ExportColumn[] = [
  { width: 12 }, { width: 34 }, { width: 16 }, { width: 18 }, { width: 22 }, { width: 12 },
  { width: 14, money: true, align: "right" }, { width: 14, money: true, align: "right" },
  { width: 14, money: true, align: "right" }, { width: 14, money: true, align: "right" },
  { width: 12, align: "right" }, { width: 26 }, { width: 8, align: "center" }, { width: 44 },
];

export function alertsText(figures: ProjectHistoryRow["figures"]): string {
  const f = figures.flags;
  return [
    f.unapproved && "Sin aprobar",
    f.awardedExceedsApproved && "Adjudicado > aprobado",
    f.executedExceedsAwarded && "Pagado > adjudicado",
    f.executedExceedsApproved && "Pagado > aprobado",
  ].filter(Boolean).join("; ");
}

export function toExportRow(r: ProjectHistoryRow): ExportRow {
  return [
    r.id, r.title, r.type, r.location ?? "", STATUS_LABELS[r.status] ?? r.status, r.createdDate ?? "",
    r.figures.estimated ?? "", r.figures.approved ?? "Sin aprobar", r.figures.awarded ?? "", r.figures.executed,
    r.figures.executionPercent ?? "",
    r.contractor?.name ?? "", r.contractor?.rating ?? "", alertsText(r.figures),
  ];
}
