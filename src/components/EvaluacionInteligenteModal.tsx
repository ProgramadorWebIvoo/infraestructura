/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de Evaluación Inteligente de Ofertas.
 * Muestra el proceso de evaluación AI en 3 estados:
 *   1. Loading — animación con failover log
 *   2. Result  — ganador, score, análisis cualitativo
 *   3. Error   — mensaje + reintento
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  BrainCircuit,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Zap,
  Sparkles,
  Bot,
  Brain,
  Network,
} from "lucide-react";
import { Project, Proposal } from "../types";
import { evaluateProposals, AIEvaluationResult, AIProviderUsed } from "../services/aiEvaluationService";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PROVIDER_META: Record<AIProviderUsed | 'auto', { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  auto: { label: "Automático (Failover)", color: "#f59e0b", Icon: Network },
  chatgpt: { label: "ChatGPT (OpenAI)", color: "#10a37f", Icon: Bot },
  gemini: { label: "Gemini (Google)", color: "#4285f4", Icon: Sparkles },
  claude: { label: "Claude (Anthropic)", color: "#d97706", Icon: Brain },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EvaluacionInteligenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  proposals: Proposal[];
  onSelectContractor: (projectId: string, contractorCode: string, proposalId: string) => Promise<void>;
  authToken: string;
  apiBaseUrl: string;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function EvaluacionInteligenteModal({
  isOpen,
  onClose,
  project,
  proposals,
  onSelectContractor,
  authToken,
  apiBaseUrl,
}: EvaluacionInteligenteModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [result, setResult] = useState<AIEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [failoverLog, setFailoverLog] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<AIProviderUsed>("chatgpt");
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'chatgpt' | 'gemini' | 'claude'>('auto');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
          setFailoverLog([]);
      setCurrentProvider("chatgpt");
      setAcceptSuccess(false);
      setAcceptError(null);
    }
  }, [isOpen]);

  // Auto-scroll del log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [failoverLog]);

  // --- Ejecutar evaluación ---
  const runEvaluation = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    setFailoverLog([]);

    // Simulamos los pasos del failover para feedback visual
    const log = (msg: string) => setFailoverLog((prev) => [...prev, msg]);

    try {
      const providerParam = selectedProvider === 'auto' ? undefined : selectedProvider;
      
      // Mostrar el proveedor correcto desde el inicio
      const displayProvider = selectedProvider === 'auto' ? 'chatgpt' : selectedProvider;
      setCurrentProvider(displayProvider);
      
      const startLabel = selectedProvider === 'auto'
        ? 'Automático (Failover: ChatGPT → Gemini → Claude)'
        : PROVIDER_META[displayProvider].label;
      
      log(`Iniciando evaluación con ${startLabel}...`);
      await delay(800);

      const data = await evaluateProposals(project, proposals, authToken, apiBaseUrl, providerParam);

      log(`✅ Evaluación completada por ${PROVIDER_META[data.providerUsed].label}`);
      setResult(data);
      setCurrentProvider(data.providerUsed);
      setStatus("result");
    } catch (err: any) {
      const message = err?.message ?? "Error desconocido al evaluar propuestas.";
      log(`❌ Error: ${message}`);
      setErrorMsg(message);
      setStatus("error");
    }
  }, [project, proposals, authToken, apiBaseUrl, selectedProvider]);

  // --- Aceptar recomendación ---
  const handleAccept = async () => {
    if (!result) return;
    setAccepting(true);
    setAcceptError(null);
    const winnerProposal = proposals.find((p) => p.contractorCode === result.winnerContractorCode);
    if (!winnerProposal) {
      setAcceptError("No se encontró la propuesta del contratista ganador.");
      setAccepting(false);
      return;
    }
    try {
      await onSelectContractor(project.id, result.winnerContractorCode, winnerProposal.id);
      setAccepting(false);
      setAcceptSuccess(true);
      // Auto-cierre después de mostrar el feedback visual
      setTimeout(() => onClose(), 1800);
    } catch (err: any) {
      setAcceptError(err?.message ?? "Error al adjudicar el contratista.");
      setAccepting(false);
    }
  };

  // --- Render ---
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400/20 text-amber-400 p-2 rounded-xl">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                Evaluación Inteligente
              </span>
              <h3 className="text-md font-bold font-sans">{project.title}</h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {project.id} • {project.proposals?.length ?? proposals.length} propuestas
              </p>
            </div>
          </div>
          <button
            id="btn-close-ai-modal"
            onClick={onClose}
            disabled={status === "loading"}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* BODY */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {status === "idle" && (
            <IdleView
              project={project}
              proposals={proposals}
              onStart={runEvaluation}
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
            />
          )}
          {status === "loading" && <LoadingView currentProvider={currentProvider} failoverLog={failoverLog} logEndRef={logEndRef} selectedProvider={selectedProvider} />}
          {status === "result" && result && (
            <ResultView
              result={result}
              proposals={proposals}
              project={project}
              onAccept={handleAccept}
              accepting={accepting}
              acceptSuccess={acceptSuccess}
              acceptError={acceptError}
              onRetry={runEvaluation}
            />
          )}
          {status === "error" && <ErrorView message={errorMsg} onRetry={runEvaluation} />}
        </div>

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-slate-400 font-medium">
            {acceptSuccess
              ? "Contratista adjudicado exitosamente."
              : acceptError
                ? "Error al adjudicar. Puede reintentar o cerrar."
                : status === "result"
                  ? "Puede aceptar la recomendación o cerrar y decidir manualmente."
                  : "Powered by ChatGPT · Gemini · Claude"}
          </span>
          {acceptSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-emerald-700 bg-emerald-100 rounded-xl border border-emerald-300"
            >
              <CheckCircle className="h-4 w-4" />
              Adjudicado
            </motion.div>
          ) : status === "result" && !accepting && !acceptError ? (
            <button
              id="btn-accept-ai-recommendation"
              onClick={handleAccept}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              Aceptar recomendación
            </button>
          ) : status === "result" && accepting ? (
            <span className="text-xs font-bold text-emerald-600">Adjudicando...</span>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// Sub-vistas
// =========================================================================

// -------------------------------------------------------------------------
// IDLE
// -------------------------------------------------------------------------
function IdleView({
  project,
  proposals,
  onStart,
  selectedProvider,
  onProviderChange,
}: {
  project: Project;
  proposals: Proposal[];
  onStart: () => Promise<void>;
  selectedProvider: 'auto' | 'chatgpt' | 'gemini' | 'claude';
  onProviderChange: (value: 'auto' | 'chatgpt' | 'gemini' | 'claude') => void;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
        <div className="bg-amber-50 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <BrainCircuit className="h-8 w-8" />
        </div>
        <h4 className="text-lg font-black text-slate-900 mb-2">Evaluación Inteligente de Ofertas</h4>
        <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          La IA analizará las {proposals.length} propuestas de este proyecto en rol de{" "}
          <strong className="text-slate-700">Ingeniero en Infraestructura</strong> con
          experiencia en finanzas y contratación, evaluando costo, plazo, riesgo y
          condicionescontractuales para recomendar la mejor opción.
        </p>
      </div>

      {/* Mini resumen del proyecto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <DollarSign className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">
            ${project.approvedInvestmentAmount?.toLocaleString("en-US") ?? "—"}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">Inversión Autorizada</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <TrendingUp className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{project.type}</div>
          <div className="text-[9px] text-slate-400 font-medium">Tipo de Obra</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <Clock className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{proposals.length}</div>
          <div className="text-[9px] text-slate-400 font-medium">Propuestas</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <ShieldCheck className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{project.location}</div>
          <div className="text-[9px] text-slate-400 font-medium">Ubicación</div>
        </div>
      </div>

      {/* Tabla resumen de propuestas */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
              <th className="py-2 px-3 text-left">Contratista</th>
              <th className="py-2 px-3 text-right">Costo Total</th>
              <th className="py-2 px-3 text-center">Entrega</th>
              <th className="py-2 px-3 text-center">Anticipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proposals.map((prop) => (
              <tr key={prop.id} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-bold text-slate-800">{prop.contractorName}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  ${prop.totalCost.toLocaleString("en-US")}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-600">{prop.deliveryWeeks} sem</td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-600">{prop.negotiatedAdvancePercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Proveedor de IA
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as 'auto' | 'chatgpt' | 'gemini' | 'claude')}
          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-white"
        >
          <option value="auto">Automático</option>
          <option value="chatgpt">ChatGPT (OpenAI)</option>
          <option value="gemini">Gemini (Google)</option>
          <option value="claude">Claude (Anthropic)</option>
        </select>
      </div>              
      <button
        id="btn-start-ai-evaluation"
        onClick={onStart}
        className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform hover:scale-[1.02]"
      >
        <Sparkles className="h-5 w-5" />
        Iniciar Evaluación con IA
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------
// LOADING
// -------------------------------------------------------------------------
function LoadingView({
  currentProvider,
  failoverLog,
  logEndRef,
  selectedProvider,
}: {
  currentProvider: AIProviderUsed;
  failoverLog: string[];
  logEndRef: React.RefObject<HTMLDivElement | null>;
  selectedProvider: 'auto' | 'chatgpt' | 'gemini' | 'claude';
}) {
  const meta = PROVIDER_META[currentProvider];
  const displayLabel = selectedProvider === 'auto'
    ? 'Automático (Failover: ChatGPT → Gemini → Claude)'
    : meta.label;

  return (
    <div className="space-y-6 text-center">
      {/* Animación principal */}
      <motion.div
        className="flex flex-col items-center gap-4 py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
          style={{ borderColor: meta.color, backgroundColor: `${meta.color}15` }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.span
            className="text-3xl"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <meta.Icon className={`w-8 h-8 text-[${meta.color}]`} />
          </motion.span>
        </motion.div>

        <div>
          <h4 className="text-base font-bold text-slate-900">Analizando propuestas...</h4>
          <p className="text-sm text-slate-500 mt-1">
            Consultando: <strong style={{ color: meta.color }}>{displayLabel}</strong>
          </p>
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Log de failover */}
      {failoverLog.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 max-h-32 overflow-y-auto text-left">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Bitácora de evaluación
          </div>
          {failoverLog.map((entry, i) => (
            <div key={i} className="text-[11px] font-mono text-slate-600 leading-relaxed">
              {entry}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// RESULT
// -------------------------------------------------------------------------
function ResultView({
  result,
  proposals,
  project,
  onAccept,
  accepting,
  acceptSuccess,
  acceptError,
  onRetry,
}: {
  result: AIEvaluationResult;
  proposals: Proposal[];
  project: Project;
  onAccept: () => void;
  accepting: boolean;
  acceptSuccess: boolean;
  acceptError: string | null;
  onRetry: () => void;
}) {
  const winnerProposal = proposals.find((p) => p.contractorCode === result.winnerContractorCode);
  const providerMeta = PROVIDER_META[result.providerUsed];

  // Score color
  const scoreColor =
    result.confidenceScore >= 80
      ? "text-emerald-600"
      : result.confidenceScore >= 60
        ? "text-amber-600"
        : "text-red-600";

  const scoreBg =
    result.confidenceScore >= 80
      ? "bg-emerald-50 border-emerald-200"
      : result.confidenceScore >= 60
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <div className="space-y-5">
      {/* Score + Provider badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
            style={{ backgroundColor: `${providerMeta.color}15`, color: providerMeta.color }}
          >
            Evaluado por {providerMeta.label}
          </span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scoreBg}`}>
          <Zap className={`h-4 w-4 ${scoreColor}`} />
          <span className={`text-xs font-black ${scoreColor}`}>
            Confianza: {result.confidenceScore}%
          </span>
        </div>
      </div>

      {/* Winner Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-3"
      >
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-wider">Mejor Opción Recomendada</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-lg font-black text-slate-900">{result.winnerContractorName}</h4>
            <p className="text-xs text-slate-500 font-mono">
              Código: {result.winnerContractorCode}
              {winnerProposal && (
                <>
                  {" · "}Costo Total:{" "}
                  <span className="font-bold text-slate-700">
                    ${winnerProposal.totalCost.toLocaleString("en-US")}
                  </span>
                  {" · "}{winnerProposal.deliveryWeeks} semanas
                </>
              )}
            </p>
          </div>
          {acceptSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 shrink-0"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-xs font-black">¡Adjudicado!</span>
            </motion.div>
          ) : accepting ? (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
              Adjudicando...
            </span>
          ) : (
            <button
              id="btn-accept-from-result"
              onClick={onAccept}
              disabled={!!acceptError}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="h-4 w-4" />
              Adjudicar a {result.winnerContractorName}
            </button>
          )}
        </div>
      </motion.div>

      {/* Error al adjudicar */}
      {acceptError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-xs font-medium">{acceptError}</div>
        </motion.div>
      )}

      {/* Comparison Matrix: Strengths / Weaknesses / Risks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3"
        >
          <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Fortalezas
          </h5>
          <ul className="space-y-1">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-[11px] text-slate-700 font-medium flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="rounded-xl border border-amber-200 bg-amber-50/30 p-3"
        >
          <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Debilidades
          </h5>
          <ul className="space-y-1">
            {result.weaknesses.map((w, i) => (
              <li key={i} className="text-[11px] text-slate-700 font-medium flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5 shrink-0">−</span>
                {w}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Risks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="rounded-xl border border-red-200 bg-red-50/30 p-3"
        >
          <h5 className="text-[10px] font-black text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Riesgos
          </h5>
          <ul className="space-y-1">
            {result.riskFactors.map((r, i) => (
              <li key={i} className="text-[11px] text-slate-700 font-medium flex items-start gap-1.5">
                <span className="text-red-500 mt-0.5 shrink-0">!</span>
                {r}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Summary / Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="space-y-3"
      >
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
            Análisis Cualitativo
          </h5>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{result.summary}</p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Recomendación Final
          </h5>
          <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
            {result.recommendation}
          </p>
        </div>
      </motion.div>

      {/* Botón reintentar (oculto, por si quieren re-evaluar) */}
      <div className="text-center pt-2">
        <button
          id="btn-reevaluate"
          onClick={onRetry}
          disabled={accepting}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors disabled:opacity-30"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-evaluar propuestas
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// ERROR
// -------------------------------------------------------------------------
function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="bg-red-50 text-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div>
        <h4 className="text-base font-black text-slate-900 mb-1">Error en la Evaluación</h4>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{message}</p>
      </div>
      <button
        id="btn-retry-ai-evaluation"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-3 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
