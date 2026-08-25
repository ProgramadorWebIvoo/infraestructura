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
 * (Procura), vía el mismo DossierEvaluationSummary con showSuggestedAmount
 * — como referencia, nunca autocompleta nada ahí tampoco.
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
 * La presentación del resultado (score/chip/resumen/factores/alertas/
 * recomendación) vive en DossierEvaluationSummary — este archivo solo
 * orquesta el estado de carga/auto-disparo/reintento.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, Sparkles } from "lucide-react";
import Button from "../../../components/UI/Button";
import Spinner from "../../../components/UI/Spinner";
import { useToast } from "../../../components/UI/Toast";
import { evaluateDossier } from "../../../services/aiEvaluationService";
import DossierEvaluationSummary from "../../../components/DossierEvaluationSummary";
import type { Project } from "../../../types";

interface DossierEvaluationPanelProps {
  project: Project;
  authToken: string;
  onEvaluated: (project: Project) => void;
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
        <DossierEvaluationSummary key="result" project={project} onReevaluate={runEvaluation} />
      )}
    </AnimatePresence>
  );
}
