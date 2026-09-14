/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tarjeta compacta de estadística (label + valor) para encabezados de
 * modal de detalle/inspección — extraído de InspectProposalModal.tsx tras
 * detectar la misma implementación reinventada de forma independiente en
 * InspectSupplierProposalModal.tsx y ContractorHistoryModal.tsx (3 copias
 * del mismo patrón, DRY roto). Fuente de verdad única de ahora en más.
 */

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import Tooltip from "./Tooltip";

interface SummaryStatProps {
  label: string;
  value: string;
  emphasize?: boolean;
  compact?: boolean;
  tone?: "success" | "danger" | "indigo";
  /** Línea secundaria bajo el valor — ej. conversión a Bs. de un monto en
   * USD, o un badge (ej. FrozenRateBadge) junto al monto congelado. */
  subValue?: ReactNode;
  /** Explicación breve del dato — se muestra en un ícono de info junto a la
   * etiqueta, útil cuando el label solo no basta (ej. cómo se calcula). */
  tooltip?: ReactNode;
}

export default function SummaryStat({ label, value, emphasize = false, compact = false, tone, subValue, tooltip }: SummaryStatProps) {
  const toneClass = tone === "success" ? "text-success-700" : tone === "danger" ? "text-danger-700" : tone === "indigo" ? "text-indigo-700" : emphasize ? "text-emerald-700" : "text-slate-700";
  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50 ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
        {tooltip && (
          <Tooltip content={tooltip} placement="top">
            <button type="button" aria-label={`Información sobre ${label}`} className="cursor-help text-slate-300 hover:text-slate-500">
              <Info className="h-2.5 w-2.5" />
            </button>
          </Tooltip>
        )}
      </span>
      <span className={`font-mono font-black ${emphasize ? "text-sm" : "text-xs"} ${toneClass}`}>{value}</span>
      {subValue && (
        typeof subValue === "string"
          ? <span className="block font-mono text-[10px] font-semibold text-slate-400 mt-0.5">{subValue}</span>
          : <span className="block mt-1">{subValue}</span>
      )}
    </div>
  );
}
