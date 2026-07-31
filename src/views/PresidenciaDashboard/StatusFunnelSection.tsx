/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pipeline ejecutivo: conteo y montos por estado del flujo, en orden canónico.
 */

import { motion } from "motion/react";
import { GitBranch } from "lucide-react";
import type { DashboardSummaryFunnelEntry } from "../../types";
import { STATUS_LABELS } from "../../utils";
import { itemVariants } from "../../animations";

interface StatusFunnelSectionProps {
  funnel: DashboardSummaryFunnelEntry[];
  totalProjects: number;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StatusFunnelSection({ funnel, totalProjects }: StatusFunnelSectionProps) {
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
          <GitBranch className="h-4 w-4 text-sky-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Pipeline por Estado</h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Obras en cada fase del flujo — {totalProjects} en total
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {funnel.map((entry) => {
          const pct = entry.count === 0 ? 0 : (entry.count / maxCount) * 100;
          return (
            <div key={entry.status} className="flex items-center gap-4 group">
              <div className="w-40 flex-shrink-0">
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </span>
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-1000 group-hover:scale-y-125 group-hover:origin-bottom"
                  style={{ width: `${pct}%`, opacity: entry.count === 0 ? 0.25 : 1 }}
                />
              </div>
              <div className="flex items-baseline gap-2 w-44 justify-end shrink-0 text-right">
                <span className="text-sm font-black font-mono text-slate-800">{entry.count}</span>
                <span className="text-[10px] text-slate-400 font-bold">obras</span>
              </div>
              <div className="hidden lg:flex flex-col items-end shrink-0 w-40 text-right">
                <span className="text-[10px] font-mono font-bold text-slate-600">
                  ${fmtMoney(entry.approvedAmount)} aprob.
                </span>
                {entry.committedAmount > 0 && (
                  <span className="text-[10px] font-mono font-bold text-indigo-600">
                    ${fmtMoney(entry.committedAmount)} comprom.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
