/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de Evaluación Inteligente de Ofertas.
 * Muestra el proceso de evaluación AI en 4 estados:
 *   1. Idle   — intro + selector de proveedor
 *   2. Loading — animación con failover log
 *   3. Result  — ganador, score, análisis cualitativo
 *   4. Error   — mensaje + reintento
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
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
import { Project, Proposal } from "../../types";
import { evaluateProposals, AIEvaluationResult, AIProviderUsed } from "../../services/aiEvaluationService";
import Modal from "../UI/Modal";
import { Table, type Column } from "../UI/Table";

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    const log = (msg: string) => setFailoverLog((prev) => [...prev, msg]);

    try {
      const providerParam = selectedProvider === 'auto' ? undefined : selectedProvider;

      const displayProvider = selectedProvider === 'auto' ? 'chatgpt' : selectedProvider;
      setCurrentProvider(displayProvider);

      const startLabel = selectedProvider === 'auto'
        ? 'Automático (Failover: ChatGPT → Gemini → Claude)'
        : PROVIDER_META[displayProvider].label;

      log(`Iniciando evaluación con ${startLabel}...`);
      await delay(800);

      const data = await evaluateProposals(project, proposals, authToken, providerParam);

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
  }, [project, proposals, authToken, selectedProvider]);

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
      setTimeout(() => onClose(), 1800);
    } catch (err: any) {
      setAcceptError(err?.message ?? "Error al adjudicar el contratista.");
      setAccepting(false);
    }
  };

  // --- Render ---
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<BrainCircuit className="h-5 w-5" />}
      badge="Evaluación Inteligente"
      title={project.title}
      infoLine={`${project.id} • ${project.proposals?.length ?? proposals.length} propuestas`}
      closeDisabled={status === "loading"}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-between items-center">
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
      }
    >
      {status === "idle" && (
        <IdleView
          project={project}
          proposals={proposals}
          onStart={runEvaluation}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
        />
      )}
      {status === "loading" && (
        <LoadingView
          currentProvider={currentProvider}
          failoverLog={failoverLog}
          logEndRef={logEndRef}
          selectedProvider={selectedProvider}
        />
      )}
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
    </Modal>
  );
}

// =========================================================================
// Sub-vistas (sin cambios)
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
          condiciones contractuales para recomendar la mejor opción.
        </p>
      </div>

      {/* Mini resumen del proyecto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <DollarSign className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">
            ${project.approvedInvestmentAmount?.toLocaleString("en-US") ?? "—"}
          </div>
          <div className="text-slate-400 mt-0.5">Inversión Máx.</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <TrendingUp className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{proposals.length}</div>
          <div className="text-slate-400 mt-0.5">Propuestas</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <Clock className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">
            {Math.min(...proposals.map(p => p.deliveryWeeks))}–{Math.max(...proposals.map(p => p.deliveryWeeks))} sem
          </div>
          <div className="text-slate-400 mt-0.5">Plazo Ofertado</div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <Zap className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="font-bold text-slate-800">{proposals.length} c/u</div>
          <div className="text-slate-400 mt-0.5">Anticipo 10–50%</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <Table
          columns={[
            { key: "contractorName", label: "Contratista", render: (p) => <span className="font-semibold text-slate-800">{p.contractorName}</span> },
            { key: "materialCost", label: "Mat.", align: "right", render: (p) => <span className="font-mono">${p.materialCost.toLocaleString()}</span> },
            { key: "laborCost", label: "M.O.", align: "right", render: (p) => <span className="font-mono">${p.laborCost.toLocaleString()}</span> },
            { key: "totalCost", label: "Total", align: "right", render: (p) => <span className="font-mono font-bold text-slate-900">${p.totalCost.toLocaleString()}</span> },
            { key: "deliveryWeeks", label: "Plazo", align: "center", render: (p) => <>{p.deliveryWeeks} sem</> },
            {
              key: "contractorRating",
              label: "Rating",
              align: "center",
              render: (p) => (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  p.contractorRating == null ? "bg-slate-50 text-slate-400" :
                  p.contractorRating >= 4 ? "bg-emerald-50 text-emerald-700" :
                  p.contractorRating >= 3 ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-700"
                }`}>
                  {p.contractorRating?.toFixed(1) ?? "—"}
                </span>
              ),
            },
          ]}
          data={proposals}
          rowKey={(p) => p.id}
        />
      </div>

      {/* Selector de proveedor AI */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Proveedor de IA
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as typeof selectedProvider)}
          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-white"
        >
          <option value="auto">Automático (Failover: ChatGPT → Gemini → Claude)</option>
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
        <BrainCircuit className="h-5 w-5" />
        Iniciar Evaluación con IA
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
  const meta = PROVIDER_META[selectedProvider === 'auto' ? 'chatgpt' : selectedProvider];

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-4 py-6">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center border-2"
          style={{
            backgroundColor: `${meta.color}15`,
            borderColor: `${meta.color}30`,
            color: meta.color,
          }}
        >
          <meta.Icon className="h-10 w-10" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-slate-700">
            Analizando propuestas con{" "}
            <span style={{ color: meta.color }}>{meta.label}</span>
          </p>
          {selectedProvider === 'auto' && (
            <p className="text-[11px] text-slate-400 mt-1">
              Failover automático: ChatGPT → Gemini → Claude
            </p>
          )}
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Failover log */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 max-h-32 overflow-y-auto text-left">
        {failoverLog.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Preparando análisis...</p>
        ) : (
          failoverLog.map((entry, i) => (
            <p key={i} className="text-[11px] font-mono text-slate-600 leading-relaxed">
              {entry}
            </p>
          ))
        )}
        <div ref={logEndRef} />
      </div>
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
  onAccept: () => Promise<void>;
  accepting: boolean;
  acceptSuccess: boolean;
  acceptError: string | null;
  onRetry: () => Promise<void>;
}) {
  const score = result.confidenceScore;
  const scoreBg =
    score >= 80
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : score >= 60
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-red-50 border-red-200 text-red-700";

  const winnerProposal = proposals.find(
    (p) => p.contractorCode === result.winnerContractorCode,
  );
  const winnerMeta = PROVIDER_META[result.providerUsed];

  return (
    <div className="space-y-5">
      {/* Top bar: proveedor + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${winnerMeta.color}20`, color: winnerMeta.color }}
          >
            <winnerMeta.Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Evaluado por {winnerMeta.label}
          </span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${scoreBg}`}>
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-black">{score}%</span>
          <span className="text-[10px] font-medium opacity-75">Confianza</span>
        </div>
      </div>

      {/* Winner card */}
      {acceptSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-black">Adjudicado a {winnerProposal?.contractorName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-emerald-800">
            <span className="font-mono font-bold">${winnerProposal?.totalCost.toLocaleString()} USD</span>
            <span>{winnerProposal?.deliveryWeeks} semanas</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-black">Adjudicado</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-black">Ganador: {winnerProposal?.contractorName}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="font-mono font-bold text-emerald-700 text-sm">
                ${winnerProposal?.totalCost.toLocaleString()} USD
              </span>
              <span>{winnerProposal?.deliveryWeeks} semanas</span>
              <span>Rating: {winnerProposal?.contractorRating?.toFixed(1) ?? "—"}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error de adjudicación */}
      {acceptError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="text-xs font-medium">{acceptError}</span>
        </motion.div>
      )}

      {/* Fortalezas / Debilidades / Riesgos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3"
        >
          <h6 className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1.5">Fortalezas</h6>
          <ul className="space-y-1">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                <span className="text-emerald-500 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-amber-200 bg-amber-50/30 p-3"
        >
          <h6 className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1.5">Debilidades</h6>
          <ul className="space-y-1">
            {result.weaknesses.map((w, i) => (
              <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                <span className="text-amber-500 mt-0.5">•</span>
                {w}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-red-200 bg-red-50/30 p-3"
        >
          <h6 className="text-[10px] font-black uppercase tracking-wider text-red-700 mb-1.5">Riesgos</h6>
          <ul className="space-y-1">
            {result.riskFactors.map((r, i) => (
              <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                <span className="text-red-400 mt-0.5">•</span>
                {r}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Análisis cualitativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-3"
      >
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Análisis Cualitativo</h6>
          <p className="text-[11px] text-slate-700 leading-relaxed">{result.summary}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h6 className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Recomendación Final</h6>
          <p className="text-[11px] text-amber-900 font-bold leading-relaxed">{result.recommendation}</p>
        </div>
      </motion.div>

      {/* Re-evaluar */}
      {!acceptSuccess && (
        <div className="text-center pt-2">
          <button
            onClick={onRetry}
            disabled={accepting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-30"
          >
            <RefreshCw className="h-3 w-3" />
            Re-evaluar
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// ERROR
// -------------------------------------------------------------------------

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="bg-red-50 text-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-1">Error en la evaluación</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{message}</p>
      </div>
      <button
        id="btn-retry-ai-evaluation"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md transition-all cursor-pointer"
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}
