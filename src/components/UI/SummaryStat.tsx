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

interface SummaryStatProps {
  label: string;
  value: string;
  emphasize?: boolean;
  compact?: boolean;
  tone?: "success" | "danger" | "indigo";
  /** Línea secundaria bajo el valor — ej. conversión a Bs. de un monto en USD. */
  subValue?: string;
}

export default function SummaryStat({ label, value, emphasize = false, compact = false, tone, subValue }: SummaryStatProps) {
  const toneClass = tone === "success" ? "text-success-700" : tone === "danger" ? "text-danger-700" : tone === "indigo" ? "text-indigo-700" : emphasize ? "text-emerald-700" : "text-slate-700";
  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50 ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`font-mono font-black ${emphasize ? "text-sm" : "text-xs"} ${toneClass}`}>{value}</span>
      {subValue && <span className="block font-mono text-[10px] font-semibold text-slate-400 mt-0.5">{subValue}</span>}
    </div>
  );
}
