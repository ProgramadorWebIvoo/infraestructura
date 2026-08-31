/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chip compacto de variación de precio (icono de tendencia + valor),
 * coloreado por dirección con tokens semánticos (SEMANTIC_COLOR_MAP:
 * danger=aumento, success=baja, neutral=estable). Extraído tras encontrar
 * la misma lógica de "icono + color según dirección" reinventada de forma
 * independiente en ContractorHistoryModal.tsx, InspectProposalModal.tsx
 * (Procura) e InspectSupplierProposalModal.tsx — la última con colores
 * Tailwind crudos (red-50/emerald-50) en vez de los tokens semánticos que
 * las otras dos ya usaban correctamente.
 *
 * Dos formas de uso según qué dato ya tiene el caller:
 * - `percent`: calcula dirección e ícono a partir del número (threshold ±5%).
 * - `label` + `direction`: el caller ya trae ambos calculados desde el
 *   backend (ej. SupplierMaterialProposalLineResource) — se muestra el
 *   label tal cual, sin reformatear.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Direction = "increase" | "decrease" | "stable";

const TONE_CLASSES: Record<Direction, string> = {
  increase: "bg-danger-100 text-danger-700",
  decrease: "bg-success-100 text-success-700",
  stable: "bg-slate-100 text-slate-600",
};

const DIRECTION_ICON: Record<Direction, typeof TrendingUp> = {
  increase: TrendingUp,
  decrease: TrendingDown,
  stable: Minus,
};

function directionFromPercent(percent: number): Direction {
  if (percent > 5) return "increase";
  if (percent < -5) return "decrease";
  return "stable";
}

type VariationBadgeProps =
  | { percent: number; label?: undefined; direction?: undefined }
  | { percent?: undefined; label: string; direction: Direction };

export default function VariationBadge(props: VariationBadgeProps) {
  const direction = props.percent != null ? directionFromPercent(props.percent) : props.direction;
  const label = props.percent != null ? `${props.percent > 0 ? "+" : ""}${props.percent.toFixed(1)}%` : props.label;
  const Icon = DIRECTION_ICON[direction];

  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${TONE_CLASSES[direction]}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
