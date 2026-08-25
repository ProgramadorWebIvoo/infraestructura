/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Evaluación IA del expediente — herramienta de Cierre de Obra, no de
 * Procura. Al montar, si el expediente todavía no tiene evaluación
 * (dossierAiEvaluatedAt ausente), la dispara automáticamente una única vez.
 * Resultados posteriores quedan cacheados en el proyecto; un botón
 * "Reevaluar" permite forzar una nueva pasada.
 *
 * El monto sugerido por la IA NO se muestra acá — a Cierre de Obra le
 * interesa completitud/riesgo para decidir si aprobar o rechazar, no una
 * cifra de presupuesto (eso es criterio de Procura). El monto sí viaja con
 * el expediente y se muestra únicamente en InvestmentApprovalSection
 * (Procura), como referencia — nunca autocompleta nada ahí tampoco.
 *
 * El caché se invalida server-side en cuanto Infraestructura corrige y
 * reenvía un expediente rechazado (ver ProjectController::resubmitProject —
 * limpia los dossier_ai_* porque los materiales que la IA vio ya no
 * existen), así que este componente nunca necesita distinguir "vigente" de
 * "obsoleto" por su cuenta: si hay resultado, es del expediente actual.
 *
 * Deliberadamente al TOPE del modal (antes del stepper) — un panel de
 * apoyo a la decisión que quedara mezclado entre metadatos/materiales pasaba
 * desapercibido; acá es lo primero que ve el auditor al abrir cualquier
 * expediente.
 *
 * El resultado (DossierEvaluationResult) entra con stagger propio — es el
 * momento de mayor peso informativo del flujo, así que score/chip/resumen/
 * alertas/recomendación aparecen en secuencia en vez de todos a la vez.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import Button from "../../../components/UI/Button";
import Spinner from "../../../components/UI/Spinner";
import { useToast } from "../../../components/UI/Toast";
import { evaluateDossier } from "../../../services/aiEvaluationService";
import { containerVariants, itemVariants } from "../../../animations";
import type { Project } from "../../../types";

interface DossierEvaluationPanelProps {
  project: Project;
  authToken: string;
  onEvaluated: (project: Project) => void;
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

export default function DossierEvaluationPanel({ project, authToken, onEvaluated }: DossierEvaluationPanelProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const autoTriggeredFor = useRef<string | null>(null);

  const hasResult = !!project.dossierAiEvaluatedAt;

  const runEvaluation = async () => {
    setIsLoading(true);
    try {
      const updated = await evaluateDossier(project.id, authToken);
      onEvaluated(updated);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo evaluar el expediente.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasResult) return;
    if (autoTriggeredFor.current === project.id) return;
    autoTriggeredFor.current = project.id;
    runEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, hasResult]);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="p-4 rounded-2xl border-2 border-sky-200 bg-sky-50 flex items-center gap-3 shadow-sm"
        >
          <Spinner size="md" className="text-sky-500" />
          <div>
            <p className="text-xs font-bold text-sky-700">Analizando expediente con IA...</p>
            <p className="text-[10px] text-sky-500 font-medium">Completitud, riesgo y datos ingresados.</p>
          </div>
        </motion.div>
      ) : !hasResult ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Evaluación IA no disponible para este expediente.</span>
          </div>
          <Button variant="secondary" size="sm" onClick={runEvaluation} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Reintentar evaluación
          </Button>
        </motion.div>
      ) : (
        <DossierEvaluationResult key="result" project={project} onReevaluate={runEvaluation} />
      )}
    </AnimatePresence>
  );
}

/**
 * Resultado de la evaluación — el momento de mayor valor informativo del
 * flujo de Cierre de Obra. Entra con un stagger propio (score → chip →
 * resumen → alertas → recomendación) en vez de aparecer de golpe, para que
 * el auditor lea la información en el mismo orden de importancia con el
 * que fue diseñada.
 */
function DossierEvaluationResult({ project, onReevaluate }: { project: Project; onReevaluate: () => void }) {
  const score = project.dossierAiScore ?? 0;
  const c = scoreClasses(score);
  const alerts = project.dossierAiAlerts ?? [];

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
            <Button variant="secondary" size="sm" onClick={onReevaluate} icon={<RefreshCw className="h-3.5 w-3.5" />}>
              Reevaluar
            </Button>
          </motion.div>

          {project.dossierAiSummary && (
            <motion.p variants={itemVariants} className="text-slate-600 leading-relaxed">{project.dossierAiSummary}</motion.p>
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
