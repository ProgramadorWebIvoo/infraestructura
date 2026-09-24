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
import type { DashboardSummary } from "@/types";
import { itemVariants } from "@/animations";
import RankBar from "@/components/UI/RankBar";
import Tooltip from "@/components/UI/Tooltip";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";

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

export default function InsightsSection({ summary }: InsightsSectionProps) {
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();
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
              <div key={c.contractorCode} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <RankBar
                    label={`${i + 1}. ${c.contractorName}`}
                    value={`$${fmtMoney(c.totalAmount)} · ${c.projectCount} obra${c.projectCount === 1 ? "" : "s"}`}
                    amount={c.totalAmount}
                    max={maxContractor}
                  />
                  <div className="flex justify-end">
                    <BsAmount amount={c.totalAmount} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                  </div>
                </div>
              </div>
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
              <div key={l.location}>
                <RankBar
                  label={l.location}
                  value={`$${fmtMoney(l.approvedAmount)} · ${l.count} obra${l.count === 1 ? "" : "s"}`}
                  amount={l.approvedAmount}
                  max={maxLocation}
                  muted={l.location === "Sin ubicación"}
                />
                <div className="flex justify-end">
                  <BsAmount amount={l.approvedAmount} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                </div>
              </div>
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
                <Tooltip key={m.month} content={`${m.month}: ${m.count} obra${m.count === 1 ? "" : "s"}`} placement="top">
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
                    <span className="text-[9px] text-slate-500 font-mono font-bold">{m.count}</span>
                    <div className="w-full flex-1 flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-50/50">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-sky-500 to-sky-400 transition-all duration-700"
                        style={{ height: `${Math.max(4, (m.count / maxMonth) * 96)}px` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">{m.month.slice(2)}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
