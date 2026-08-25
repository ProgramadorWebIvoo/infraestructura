/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Presentación de la evaluación IA del expediente (score, resumen, alertas,
 * recomendación, factores de completitud, monto sugerido) — extraída de
 * DossierEvaluationPanel.tsx (Cierre de Obra) para poder reusarse también en
 * el modal de Autorización de Inversión de Procura, donde el monto sugerido
 * por IA es información de apoyo directamente relevante para fijar el tope
 * presupuestario.
 *
 * Omitir `onReevaluate` oculta el botón "Reevaluar" — Procura consulta la
 * evaluación ya hecha por Cierre de Obra, no dispara ni repite el análisis
 * (esa acción sigue siendo exclusiva del auditor que la generó).
 *
 * `showSuggestedAmount` es opcional (default false) porque a Cierre de Obra
 * le interesa completitud/riesgo para decidir aprobar o rechazar, no una
 * cifra de presupuesto — ver DossierEvaluationPanel.tsx. El monto nunca
 * autocompleta ningún campo, en ningún consumidor: es solo referencia visual.
 */

import { AlertTriangle, RefreshCw, Sparkles, Wallet } from "lucide-react";
import Button from "./UI/Button";
import { containerVariants, itemVariants } from "../animations";
import { motion } from "motion/react";
import { formatCurrency } from "../utils";
import type { Project } from "../types";

interface DossierEvaluationSummaryProps {
  project: Project;
  /** Omitido (o `undefined`) oculta el botón "Reevaluar" — vista de solo lectura. */
  onReevaluate?: () => void;
  /** Muestra el monto sugerido por IA junto al score — relevante para Procura, no para Cierre de Obra. */
  showSuggestedAmount?: boolean;
}

function scoreClasses(score: number): { text: string; ring: string; bg: string; border: string; label: string } {
  if (score < 50) return { text: "text-danger-700", ring: "ring-danger-200", bg: "bg-danger-50", border: "border-danger-300", label: "Riesgo alto" };
  if (score < 75) return { text: "text-warning-700", ring: "ring-warning-200", bg: "bg-warning-50", border: "border-warning-300", label: "Requiere atención" };
  return { text: "text-success-700", ring: "ring-success-200", bg: "bg-success-50", border: "border-success-300", label: "Expediente sólido" };
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "recién";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.floor(diffH / 24)} d`;
}

const COMPLETENESS_FACTORS: { key: "documentation" | "budgetConsistency" | "rejectionRisk"; label: string }[] = [
  { key: "documentation", label: "Documentación" },
  { key: "budgetConsistency", label: "Consistencia presupuestaria" },
  { key: "rejectionRisk", label: "Riesgo de rechazo" },
];

/**
 * Resultado de la evaluación — el momento de mayor valor informativo del
 * flujo de Cierre de Obra. Entra con un stagger propio (score → chip →
 * resumen → alertas → recomendación) en vez de aparecer de golpe, para que
 * el lector reciba la información en el mismo orden de importancia con el
 * que fue diseñada.
 */
export default function DossierEvaluationSummary({ project, onReevaluate, showSuggestedAmount = false }: DossierEvaluationSummaryProps) {
  const score = project.dossierAiScore ?? 0;
  const c = scoreClasses(score);
  const alerts = project.dossierAiAlerts ?? [];
  const factors = project.dossierAiCompletenessFactors;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`rounded-2xl ${c.bg} shadow-sm overflow-hidden`}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Score dominante, primer elemento visual del panel */}
        <motion.div
          variants={itemVariants}
          className={`shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-full bg-white ring-4 ${c.ring} shadow-sm`}
        >
          <span className={`font-mono font-black text-xl leading-none ${c.text}`}>{score}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">/100</span>
        </motion.div>

        <div className="min-w-0 flex-1 space-y-2 text-xs">
          <motion.div variants={itemVariants} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span className="font-black text-slate-800">Evaluación IA del Expediente</span>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border}`}>{c.label}</span>
            </div>
            {onReevaluate && (
              <Button variant="secondary" size="sm" onClick={onReevaluate} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                Reevaluar
              </Button>
            )}
          </motion.div>

          {showSuggestedAmount && project.dossierAiSuggestedAmount != null && (
            <motion.div variants={itemVariants} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 border border-brand-200 px-3 py-2">
              <span className="flex items-center gap-1.5 font-bold text-brand-700">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                Monto sugerido por IA
              </span>
              <span className="font-mono font-black text-brand-800">{formatCurrency(project.dossierAiSuggestedAmount)}</span>
            </motion.div>
          )}

          {project.dossierAiSummary && (
            <motion.p variants={itemVariants} className="text-slate-600 leading-relaxed">{project.dossierAiSummary}</motion.p>
          )}

          {factors && (
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2 pt-1">
              {COMPLETENESS_FACTORS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                    <span className="truncate">{label}</span>
                    <span className="font-mono text-slate-600 shrink-0 ml-1">{factors[key]}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${factors[key] >= 75 ? "bg-success-500" : factors[key] >= 50 ? "bg-warning-500" : "bg-danger-500"}`}
                      style={{ width: `${Math.min(100, Math.max(0, factors[key]))}%` }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {alerts.length > 0 && (
            <motion.ul variants={itemVariants} className="space-y-1">
              {alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-1.5 text-slate-600">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning-500 shrink-0 mt-px" />
                  {alert}
                </li>
              ))}
            </motion.ul>
          )}

          {project.dossierAiRecommendation && (
            <motion.p variants={itemVariants} className="italic text-slate-500 border-l-2 border-slate-300 pl-3">{project.dossierAiRecommendation}</motion.p>
          )}

          <motion.p variants={itemVariants} className="text-[10px] text-slate-400 font-medium">
            Evaluado por {project.dossierAiProvider}
            {project.dossierAiEvaluatedAt && ` · ${relativeTime(project.dossierAiEvaluatedAt)}`}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
