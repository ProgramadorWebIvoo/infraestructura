/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado Result del modal de Evaluación Inteligente.
 * Muestra el ganador, score de confianza, análisis cualitativo.
 */

import { motion } from "motion/react";
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import type { ResultViewProps } from "./types";

export default function ResultView({
  result,
  winnerProposalName,
  winnerTotalCost,
  winnerDeliveryWeeks,
  winnerRating,
  accepting,
  acceptSuccess,
  acceptError,
  onRetry,
}: ResultViewProps) {
  const score = result.confidenceScore;

  return (
    <div className="space-y-5">
      {/* Score badge */}
      <div className="flex justify-end">
        <ScoreBadge score={score} />
      </div>

      {/* Winner card */}
      {acceptSuccess ? (
        <AcceptedBanner
          name={winnerProposalName}
          totalCost={winnerTotalCost}
          deliveryWeeks={winnerDeliveryWeeks}
        />
      ) : (
        <WinnerCard
          name={winnerProposalName}
          totalCost={winnerTotalCost}
          deliveryWeeks={winnerDeliveryWeeks}
          rating={winnerRating}
        />
      )}

      {/* Error de adjudicación */}
      {acceptError && <ErrorAlert message={acceptError} />}

      {/* Fortalezas / Debilidades / Riesgos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AnalysisColumn
          title="Fortalezas"
          items={result.strengths}
          color="emerald"
          delay={0.1}
        />
        <AnalysisColumn
          title="Debilidades"
          items={result.weaknesses}
          color="amber"
          delay={0.2}
        />
        <AnalysisColumn
          title="Riesgos"
          items={result.riskFactors}
          color="red"
          delay={0.3}
        />
      </div>

      {/* Análisis cualitativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-3"
      >
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
            Análisis Cualitativo
          </h6>
          <p className="text-[11px] text-slate-700 leading-relaxed">{result.summary}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h6 className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
            Recomendación Final
          </h6>
          <p className="text-[11px] text-amber-900 font-bold leading-relaxed">
            {result.recommendation}
          </p>
        </div>
      </motion.div>

      {/* Re-evaluar */}
      {!acceptSuccess && (
        <div className="text-center pt-2">
          <button
            onClick={onRetry}
            disabled={accepting}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            <RefreshCw className="h-3 w-3" />
            Re-evaluar
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-componentes internos ─── */

function ScoreBadge({ score }: { score: number }) {
  const bg =
    score >= 80
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : score >= 60
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-red-50 border-red-200 text-red-700";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${bg}`}>
      <ShieldCheck className="h-4 w-4" />
      <span className="text-xs font-black">{score}%</span>
      <span className="text-[10px] font-medium opacity-75">Confianza</span>
    </div>
  );
}

function WinnerCard({
  name,
  totalCost,
  deliveryWeeks,
  rating,
}: {
  name: string;
  totalCost: number;
  deliveryWeeks: number;
  rating: number | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-emerald-700">
        <TrendingUp className="h-5 w-5" />
        <span className="text-sm font-black">Ganador: {name}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="font-mono font-bold text-emerald-700 text-sm">
            ${totalCost.toLocaleString()} USD
          </span>
          <span>{deliveryWeeks > 0 ? `${deliveryWeeks} semanas` : "Sin dato"}</span>
          <span>Rating: {rating?.toFixed(1) ?? "—"}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AcceptedBanner({
  name,
  totalCost,
  deliveryWeeks,
}: {
  name: string;
  totalCost: number;
  deliveryWeeks: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-emerald-700">
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-black">Adjudicado a {name}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-emerald-800">
        <span className="font-mono font-bold">${totalCost.toLocaleString()} USD</span>
        <span>{deliveryWeeks} semanas</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs font-black">Adjudicado</span>
      </div>
    </motion.div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="text-xs font-medium">{message}</span>
    </motion.div>
  );
}

function AnalysisColumn({
  title,
  items,
  color,
  delay,
}: {
  title: string;
  items: string[];
  color: "emerald" | "amber" | "red";
  delay: number;
}) {
  const borderMap = { emerald: "border-emerald-200", amber: "border-amber-200", red: "border-red-200" };
  const bgMap = { emerald: "bg-emerald-50/30", amber: "bg-amber-50/30", red: "bg-red-50/30" };
  const textMap = { emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" };
  const bulletMap = { emerald: "text-emerald-500", amber: "text-amber-500", red: "text-red-400" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-xl border ${borderMap[color]} ${bgMap[color]} p-3`}
    >
      <h6 className={`text-[10px] font-black uppercase tracking-wider ${textMap[color]} mb-1.5`}>
        {title}
      </h6>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">Ninguno</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
              <span className={`${bulletMap[color]} mt-0.5`}>•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
