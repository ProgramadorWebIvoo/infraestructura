/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estimado vs aprobado vs adjudicado vs ejecutado de una obra, con semáforo
 * de ejecución (umbrales de CONFIG APP vía useBudgetSemaphore) y alertas.
 */

import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "@/components/UI/colorTokens";
import { SEMAPHORE_COLORS, useBudgetSemaphore } from "@/hooks/useBudgetSemaphore";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";
import type { ProjectHistoryFigures } from "../projectHistoryTypes";

export const fmtMoney = (n: number | null | undefined) => (n === null || n === undefined ? "—" : formatCurrency(n));

export const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

interface FigureCardProps {
  label: string;
  amount: number | null;
  tone: SemanticColor;
  hint?: string;
  variation?: number | null;
  emptyLabel?: string;
}

function FigureCard({ label, amount, tone, hint, variation, emptyLabel = "Sin dato" }: FigureCardProps) {
  const color = SEMANTIC_COLOR_MAP[tone];
  const { convert, hasRates, isLoading } = useCurrencyConversion();

  return (
    <div className={`rounded-2xl border p-4 ${color.bg50} ${color.border200}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wide ${color.text700}`}>{label}</p>
      <p className="mt-1 text-xl font-bold text-text-primary font-mono">{amount === null ? emptyLabel : fmtMoney(amount)}</p>
      {amount !== null && (
        <BsAmount amount={amount} convert={convert} hasRates={hasRates} isLoading={isLoading} variant="block" className="text-text-tertiary" />
      )}
      {hint && <p className="mt-1 text-[11px] text-text-secondary">{hint}</p>}
      {variation !== undefined && variation !== null && (
        <p className={`mt-1 text-[11px] font-mono font-bold ${color.text600}`}>{fmtPct(variation)}</p>
      )}
    </div>
  );
}

const ALERTS: { flag: keyof ProjectHistoryFigures["flags"]; text: string }[] = [
  { flag: "unapproved", text: "Obra sin monto aprobado: la ejecución no puede medirse contra un presupuesto." },
  { flag: "awardedExceedsApproved", text: "El monto adjudicado supera lo aprobado." },
  { flag: "executedExceedsAwarded", text: "Lo pagado supera lo adjudicado." },
  { flag: "executedExceedsApproved", text: "Lo pagado supera lo aprobado (sobre-ejecución)." },
];

export default function ProjectHistoryFiguresPanel({ figures }: { figures: ProjectHistoryFigures }) {
  const { levelOf } = useBudgetSemaphore();
  const pct = figures.executionPercent;
  const level = pct !== null ? levelOf(pct) : null;
  const sem = level ? SEMAPHORE_COLORS[level] : null;
  const danger = SEMANTIC_COLOR_MAP.danger;
  const activeAlerts = ALERTS.filter((a) => figures.flags[a.flag]);

  return (
    <section aria-label="Cifras de la obra" className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FigureCard label="Estimado" amount={figures.estimated} tone="neutral" hint="Presupuesto de la petición" />
        <FigureCard label="Aprobado" amount={figures.approved} tone="brand" emptyLabel="Sin aprobar" variation={figures.variation.approvedVsEstimated} hint="vs. estimado" />
        <FigureCard label="Adjudicado" amount={figures.awarded} tone="info" emptyLabel="Sin adjudicar" variation={figures.variation.awardedVsApproved} hint="vs. aprobado" />
        <FigureCard label="Ejecutado" amount={figures.executed} tone="success" variation={figures.variation.executedVsAwarded} hint="pagado, vs. adjudicado" />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
        <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
          <span>Ejecución vs. aprobado</span>
          {sem ? (
            <span className={`rounded-pill border px-2 py-0.5 ${sem.bg} ${sem.text}`}>
              {fmtPct(pct).replace("+", "")} · {sem.label}
            </span>
          ) : (
            <span className="text-text-tertiary">No medible</span>
          )}
        </div>
        <div className="mt-2 h-2.5 rounded-pill bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, pct ?? 0)}>
          <div className={`h-full rounded-pill ${sem?.bar ?? ""}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <ul className={`rounded-2xl border p-4 space-y-1 ${danger.bg50} ${danger.border200}`} aria-label="Alertas de la obra">
          {activeAlerts.map((a) => (
            <li key={a.flag} className={`flex items-start gap-2 text-xs font-semibold ${danger.text700}`}>
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              {a.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
