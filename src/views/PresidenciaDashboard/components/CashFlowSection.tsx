/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Flujo de caja mensual: desembolsos reales (anticipos + finiquitos) por mes,
 * derivado de advancePaidDate/finalPaidDate. Complementa la tendencia de
 * "obras creadas" con la salida de caja efectiva del portafolio.
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { Landmark } from "lucide-react";
import type { Project } from "../../../types";
import { itemVariants } from "../../../animations";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface CashFlowSectionProps {
  projects: Project[];
}

interface MonthEntry {
  month: string;
  advances: number;
  finals: number;
  total: number;
}

export default function CashFlowSection({ projects }: CashFlowSectionProps) {
  const months = useMemo<MonthEntry[]>(() => {
    const map = new Map<string, MonthEntry>();
    const add = (date: string | undefined, amount: number | undefined, kind: "advances" | "finals") => {
      if (!date || !amount) return;
      const key = date.slice(0, 7);
      const entry = map.get(key) ?? { month: key, advances: 0, finals: 0, total: 0 };
      entry[kind] += amount;
      entry.total += amount;
      map.set(key, entry);
    };
    projects.forEach((p) => {
      add(p.advancePaidDate, p.advancePaidAmount, "advances");
      add(p.finalPaidDate, p.finalPaidAmount, "finals");
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([, e]) => e);
  }, [projects]);

  const maxTotal = Math.max(1, ...months.map((m) => m.total));
  const grandTotal = months.reduce((s, m) => s + m.total, 0);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-emerald-400"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
          <Landmark className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Flujo de Caja Mensual</h2>
          <p className="text-[11px] text-slate-500 font-medium">Desembolsos reales (anticipos + finiquitos) por mes</p>
        </div>
        <span className="ml-auto text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1">
          Total ${fmtMoney(grandTotal)}
        </span>
      </div>

      {months.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">Aún no hay desembolsos registrados.</p>
      ) : (
        <div role="img" aria-label={`Flujo de caja mensual. ${months.map((m) => `${m.month}: ${fmtMoney(m.total)}`).join(", ")}`}>
          <div className="flex items-end gap-2 h-40 border-b border-slate-100 pb-4">
            {months.map((m) => (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full" title={`${m.month}: ${fmtMoney(m.total)}`}>
                <span className="text-[9px] text-slate-500 font-mono font-bold">{fmtMoney(m.total)}</span>
                <div className="w-full flex-1 flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-50/50">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-700"
                    style={{ height: `${Math.max(4, (m.total / maxTotal) * 96)}px` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-mono">{m.month.slice(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Desembolsos
            </span>
            <span className="text-slate-400 font-medium">Anticipos + finiquitos efectuados por mes</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}