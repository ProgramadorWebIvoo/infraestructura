/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Snapshot financiero del expediente — estimado, tope aprobado, contrato
 * final, anticipo, liquidación y total liberado. Extraído de
 * InspectProjectModal.tsx (división por SRP: cada sección del modal es
 * visual y lógicamente independiente de las otras dos).
 */

import type { Project } from "../../../types";
import { approvedOf, winnerOf } from "../../../utils/dashboardSummary";
import { formatCurrency } from "../../../utils";

function FinancialStat({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "purple" | "indigo" | "rose" | "emerald";
}) {
  const toneClasses: Record<string, string> = {
    slate: "text-slate-900",
    purple: "text-purple-700",
    indigo: "text-indigo-700",
    rose: "text-rose-700",
    emerald: "text-emerald-700",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 font-mono font-black text-sm leading-tight ${toneClasses[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{sub}</div>}
    </div>
  );
}

export default function FinancialSnapshot({ project }: { project: Project }) {
  const approved = approvedOf(project);
  const released = (project.advancePaidAmount ?? 0) + (project.finalPaidAmount ?? 0);
  const pct = approved > 0 ? Math.min(100, Math.round((released / approved) * 100)) : 0;
  const winner = winnerOf(project);
  const variance = winner && project.estimatedTotal > 0 ? ((winner.totalCost - project.estimatedTotal) / project.estimatedTotal) * 100 : null;

  return (
    <section aria-label="Snapshot financiero">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <FinancialStat label="Estimado materiales" value={formatCurrency(project.estimatedTotal)} tone="slate" />
        <FinancialStat
          label="Tope aprobado"
          value={project.approvedInvestmentAmount != null ? formatCurrency(project.approvedInvestmentAmount) : "—"}
          sub={project.approvedInvestmentAmount == null ? "Pendiente Procura" : undefined}
          tone={project.approvedInvestmentAmount != null ? "purple" : "slate"}
        />
        <FinancialStat
          label="Contrato final"
          value={winner ? formatCurrency(winner.totalCost) : "—"}
          sub={variance != null ? `${variance >= 0 ? "+" : ""}${variance.toFixed(1)}% vs estimado` : "Sin adjudicar"}
          tone={winner ? "indigo" : "slate"}
        />
        <FinancialStat
          label="Anticipo pagado"
          value={project.advancePaidAmount ? formatCurrency(project.advancePaidAmount) : "—"}
          sub={project.advancePaidDate ?? undefined}
          tone={project.advancePaidAmount ? "rose" : "slate"}
        />
        <FinancialStat
          label="Liquidación final"
          value={project.finalPaidAmount ? formatCurrency(project.finalPaidAmount) : "—"}
          sub={project.finalPaidDate ?? undefined}
          tone={project.finalPaidAmount ? "emerald" : "slate"}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Liberado total</div>
          <div className="mt-1 font-mono font-black text-sm text-sky-700">{formatCurrency(released)}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${pct >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-sky-400 to-sky-600"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600 whitespace-nowrap">{pct}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
