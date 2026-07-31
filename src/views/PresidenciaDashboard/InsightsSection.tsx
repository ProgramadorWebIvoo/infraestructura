/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Insights ejecutivos: top contratistas, desglose por ubicación y tendencia
 * mensual de creación (gráfico de barras). Las barras de ranking se miden
 * contra el monto máximo del grupo (no contra un string formateado).
 */

import { motion } from "motion/react";
import { Award, MapPinned, TrendingUp } from "lucide-react";
import type { DashboardSummary } from "../../types";
import { itemVariants } from "../../animations";

interface InsightsSectionProps {
  summary: DashboardSummary;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CARD = "bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-300";
const CARD_HEADER = "flex items-center gap-2 mb-4";

function MiniSectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className={CARD_HEADER}>
      <span className="text-sky-500">{icon}</span>
      <h3 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">{label}</h3>
    </div>
  );
}

/** Barra de ranking: el ancho es proporcional a `amount` (monto real). */
function RankBar({ label, value, amount, max }: { label: string; value: string; amount: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-700 truncate group-hover:text-slate-900">{label}</span>
          <span className="text-[10px] font-mono font-black text-slate-600 whitespace-nowrap">{value}</span>
        </div>
        <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
          <div
            className="bg-gradient-to-r from-sky-400 to-sky-600 h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, opacity: label === "Sin ubicación" ? 0.5 : 1 }}
          />
        </div>
      </div>
    </div>
  );
}

export default function InsightsSection({ summary }: InsightsSectionProps) {
  const maxContractor = Math.max(1, ...summary.topContractors.map((c) => c.totalAmount));
  const maxLocation = Math.max(1, ...summary.locationBreakdown.map((l) => l.approvedAmount));
  const months = summary.monthlyTrend.slice(-12);
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top contratistas */}
      <div className={CARD}>
        <MiniSectionTitle icon={<Award className="h-4 w-4" />} label="Top Contratistas" />
        <div className="space-y-3">
          {summary.topContractors.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">Aún no hay contratos adjudicados.</p>
          ) : (
            summary.topContractors.map((c, i) => (
              <RankBar
                key={c.contractorCode}
                label={`${i + 1}. ${c.contractorName}`}
                value={`$${fmtMoney(c.totalAmount)} · ${c.projectCount} obra${c.projectCount === 1 ? "" : "s"}`}
                amount={c.totalAmount}
                max={maxContractor}
              />
            ))
          )}
        </div>
      </div>

      {/* Ubicaciones */}
      <div className={CARD}>
        <MiniSectionTitle icon={<MapPinned className="h-4 w-4" />} label="Inversión por Ubicación" />
        <div className="space-y-3">
          {summary.locationBreakdown.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">Sin obras registradas.</p>
          ) : (
            summary.locationBreakdown.map((l) => (
              <RankBar
                key={l.location}
                label={l.location}
                value={`$${fmtMoney(l.approvedAmount)} · ${l.count} obra${l.count === 1 ? "" : "s"}`}
                amount={l.approvedAmount}
                max={maxLocation}
              />
            ))
          )}
        </div>
      </div>

      {/* Creación por mes — gráfico de barras vertical */}
      <div className={`${CARD} md:col-span-2`}>
        <div className="flex items-center justify-between mb-4">
          <div className={CARD_HEADER + " mb-0"}>
            <TrendingUp className="h-4 w-4 text-sky-500" />
            <h3 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">
              Obras Creadas por Mes (últimos 12)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">Máximo: {maxMonth} obras/mes</span>
        </div>

        {months.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">Sin registros históricos.</p>
        ) : (
          <div
            role="img"
            aria-label={`Gráfico de obras creadas por mes. ${months.map((m) => `${m.month}: ${m.count}`).join(", ")}`}
          >
            <div className="flex items-end gap-2 h-36 border-b border-slate-100 pb-4">
              {months.map((m) => (
                <div
                  key={m.month}
                  className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full"
                  title={`${m.month}: ${m.count} obra${m.count === 1 ? "" : "s"}`}
                >
                  <span className="text-[9px] text-slate-500 font-mono font-bold">{m.count}</span>
                  <div className="w-full flex-1 flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-50/50">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-sky-400 transition-all duration-700"
                      style={{ height: `${Math.max(4, (m.count / maxMonth) * 96)}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">{m.month.slice(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
