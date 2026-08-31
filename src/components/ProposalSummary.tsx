/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resumen comparativo de las propuestas — "Mejor Oferta" es la métrica que
 * más pesa en la decisión, así que ocupa el doble de espacio con número más
 * grande y una barra visual comparando el costo contra el presupuesto
 * autorizado. Extraído de ProcuraPanel/components/BidEvaluationSection.tsx
 * para reusarse también en Analistas (carga de propuestas + cuadro
 * comparativo), donde la misma jerarquía visual aplica mientras se cargan
 * ofertas, no solo al momento de adjudicar.
 */

import { motion } from "motion/react";
import { Clock, Star, Trophy, Wallet } from "lucide-react";
import { containerVariants, itemVariants, springs } from "../animations";
import { formatCurrency } from "../utils";
import { useCurrencyConversion, formatBs } from "../hooks/useCurrencyConversion";
import type { Project } from "../types";

export default function ProposalSummary({ project }: { project: Project }) {
  const proposals = project.proposals ?? [];
  const { convert, hasRates } = useCurrencyConversion();
  if (proposals.length === 0) return null;

  const best = proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]);
  const authorized = project.approvedInvestmentAmount ?? 0;
  const savings = authorized - best.totalCost;
  const savingsPct = authorized > 0 ? (Math.abs(savings) / authorized) * 100 : 0;
  const bestPctOfAuthorized = authorized > 0 ? Math.min(100, (best.totalCost / authorized) * 100) : 0;
  const weeks = proposals.map(p => p.deliveryWeeks || 0);
  const minWeeks = Math.min(...weeks);
  const maxWeeks = Math.max(...weeks);
  const avgRating = proposals.reduce((s, p) => s + (p.contractorRating ?? 0), 0) / proposals.length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Hero: Mejor Oferta — ocupa 2 columnas, número dominante + barra vs autorizado */}
      <motion.div
        variants={itemVariants}
        className="col-span-2 rounded-2xl border border-success-200 bg-gradient-to-br from-success-50 to-white p-4 shadow-sm relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-success-100/60 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-success-700 text-[10px] font-black uppercase tracking-wider">
            <Trophy className="h-3.5 w-3.5" /> Mejor Oferta
          </div>
          {savings >= 0 && (
            <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-success-600 text-white shadow-sm">
              {savingsPct.toFixed(0)}% ahorro
            </span>
          )}
        </div>
        <div className="relative mt-1.5 font-mono font-black text-success-800 text-2xl tracking-tight">
          {formatCurrency(best.totalCost)}
        </div>
        {hasRates && (
          <div className="relative text-[10px] font-mono font-semibold text-success-600/70 -mt-1">
            Bs. {formatBs(convert(best.totalCost, "USD"))}
          </div>
        )}
        <div className="relative text-xs text-slate-600 font-bold truncate mt-0.5" title={best.contractorName}>{best.contractorName}</div>
        {authorized > 0 && (
          <div className="relative mt-3 space-y-1">
            <div className="h-1.5 rounded-full bg-success-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bestPctOfAuthorized}%` }}
                transition={{ ...springs.gentle, delay: 0.15 }}
                className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-600"
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400">
              <span>{bestPctOfAuthorized.toFixed(0)}% del autorizado</span>
              <span>{formatCurrency(authorized)}</span>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className={`rounded-xl border p-3 ${savings >= 0 ? "border-info-100 bg-info-50/40" : "border-danger-100 bg-danger-50/40"}`}>
        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${savings >= 0 ? "text-info-600" : "text-danger-600"}`}>
          <Wallet className="h-3 w-3" /> {savings >= 0 ? "Ahorro" : "Sobre Presupuesto"}
        </div>
        <div className={`mt-1 font-mono font-black text-sm ${savings >= 0 ? "text-info-700" : "text-danger-700"}`}>
          {formatCurrency(Math.abs(savings))}
        </div>
        {hasRates && (
          <div className={`text-[9px] font-mono ${savings >= 0 ? "text-info-500/70" : "text-danger-500/70"}`}>
            Bs. {formatBs(convert(Math.abs(savings), "USD"))}
          </div>
        )}
        <div className="text-[10px] text-slate-500 font-medium">vs {formatCurrency(authorized)} autorizado</div>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-3">
        <div className="flex items-center gap-1.5 text-neutral-600 text-[9px] font-black uppercase tracking-wider">
          <Clock className="h-3 w-3" /> Entrega
        </div>
        <div className="mt-1 font-mono font-black text-neutral-700 text-sm">
          {minWeeks > 0 ? `${minWeeks}–${maxWeeks}` : "—"}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">semanas estimadas</div>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-xl border border-warning-100 bg-warning-50/40 p-3">
        <div className="flex items-center gap-1.5 text-warning-600 text-[9px] font-black uppercase tracking-wider">
          <Star className="h-3 w-3" /> Rating Promedio
        </div>
        <div className="mt-1 font-mono font-black text-warning-700 text-sm">
          {avgRating > 0 ? avgRating.toFixed(1) : "—"}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">de {proposals.length} postores</div>
      </motion.div>
    </motion.div>
  );
}
