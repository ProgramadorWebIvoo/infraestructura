/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de Evaluación Inteligente de Ofertas.
 * Orquesta 4 estados: idle → loading → result | error.
 * Las sub-vistas están extraídas en archivos separados.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { BrainCircuit, CheckCircle } from "lucide-react";
import Modal from "../../UI/Modal";
import type { Project, Proposal } from "../../../types";
import {
  evaluateProposals,
  AIEvaluationResult,
  type AIProviderUsed,
} from "../../../services/aiEvaluationService";
import { PROVIDER_META } from "./constants";
import IdleView from "./IdleView";
import LoadingView from "./LoadingView";
import ResultView from "./ResultView";
import ErrorView from "./ErrorView";

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
  const [selectedProvider, setSelectedProvider] = useState<"auto" | AIProviderUsed>("auto");
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
      const providerParam = selectedProvider === "auto" ? undefined : selectedProvider;

      const displayProvider = selectedProvider === "auto" ? "chatgpt" : selectedProvider;
      setCurrentProvider(displayProvider);

      const startLabel =
        selectedProvider === "auto"
          ? "Automático (Failover: ChatGPT → Gemini → Claude)"
          : PROVIDER_META[displayProvider].label;

      log(`Iniciando evaluación con ${startLabel}...`);

      const data = await evaluateProposals(project, proposals, authToken, providerParam);

      // Mostrar el log de failover del backend
      if (data.attemptLog && data.attemptLog.length > 0) {
        data.attemptLog.forEach((entry) => log(entry));
      }

      log(`✅ Evaluación completada por ${PROVIDER_META[data.providerUsed].label}`);
      setResult(data);
      setCurrentProvider(data.providerUsed);
      setStatus("result");
    } catch (err: unknown) {
      const error = err as Error & { attemptLog?: string[] };
      const message = error?.message ?? "Error desconocido al evaluar propuestas.";
      log(`❌ Error: ${message}`);

      if (error?.attemptLog && error.attemptLog.length > 0) {
        error.attemptLog.forEach((entry: string) => log(entry));
      }

      setErrorMsg(message);
      setStatus("error");
    }
  }, [project, proposals, authToken, selectedProvider]);

  // --- Aceptar recomendación ---
  const handleAccept = async () => {
    if (!result) return;
    setAccepting(true);
    setAcceptError(null);
    const winnerProposal = proposals.find(
      (p) => p.contractorCode === result.winnerContractorCode,
    );
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
    } catch (err: unknown) {
      const error = err as Error;
      setAcceptError(error?.message ?? "Error al adjudicar el contratista.");
      setAccepting(false);
    }
  };

  // --- Métricas para IdleView ---
  const idleMetrics = useMemo(() => {
    const weeks = proposals.map((p) => p.deliveryWeeks);
    return {
      proposalCount: proposals.length,
      approvedInvestmentAmount: project.approvedInvestmentAmount,
      deliveryWeeksMin: weeks.length > 0 ? Math.min(...weeks) : 0,
      deliveryWeeksMax: weeks.length > 0 ? Math.max(...weeks) : 0,
    };
  }, [proposals, project.approvedInvestmentAmount]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<BrainCircuit className="h-5 w-5" />}
      badge="Evaluación Inteligente"
      title={project.title}
      infoLine={`${project.id} • ${proposals.length} propuestas`}
      closeDisabled={status === "loading"}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-between items-center">
          <FooterHint
            status={status}
            acceptSuccess={acceptSuccess}
            acceptError={acceptError}
          />
          {acceptSuccess ? (
            <AcceptedBadge />
          ) : status === "result" && !accepting && !acceptError ? (
            <AcceptButton onClick={handleAccept} />
          ) : status === "result" && accepting ? (
            <span className="text-xs font-bold text-emerald-600">Adjudicando...</span>
          ) : null}
        </div>
      }
    >
      {status === "idle" && (
        <IdleView
          proposalCount={idleMetrics.proposalCount}
          approvedInvestmentAmount={idleMetrics.approvedInvestmentAmount}
          deliveryWeeksMin={idleMetrics.deliveryWeeksMin}
          deliveryWeeksMax={idleMetrics.deliveryWeeksMax}
          proposals={proposals.map((p) => ({
            id: p.id,
            contractorName: p.contractorName,
            materialCost: p.materialCost,
            laborCost: p.laborCost,
            totalCost: p.totalCost,
            deliveryWeeks: p.deliveryWeeks,
            contractorRating: p.contractorRating ?? null,
          }))}
          onStart={runEvaluation}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
        />
      )}
      {status === "loading" && (
        <LoadingView
          providerLabel={PROVIDER_META[selectedProvider === "auto" ? "chatgpt" : selectedProvider].label}
          providerColor={PROVIDER_META[selectedProvider === "auto" ? "chatgpt" : selectedProvider].color}
          Icon={PROVIDER_META[selectedProvider === "auto" ? "chatgpt" : selectedProvider].Icon}
          failoverLog={failoverLog}
          isAutoMode={selectedProvider === "auto"}
          logEndRef={logEndRef}
        />
      )}
      {status === "result" && result && (
        <ResultView
          result={result}
          winnerProposalName={
            proposals.find((p) => p.contractorCode === result.winnerContractorCode)
              ?.contractorName ?? "—"
          }
          winnerTotalCost={
            proposals.find((p) => p.contractorCode === result.winnerContractorCode)
              ?.totalCost ?? 0
          }
          winnerDeliveryWeeks={
            proposals.find((p) => p.contractorCode === result.winnerContractorCode)
              ?.deliveryWeeks ?? 0
          }
          winnerRating={
            proposals.find((p) => p.contractorCode === result.winnerContractorCode)
              ?.contractorRating ?? null
          }
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

// ---------------------------------------------------------------------------
// Sub-componentes del footer
// ---------------------------------------------------------------------------

function FooterHint({
  status,
  acceptSuccess,
  acceptError,
}: {
  status: string;
  acceptSuccess: boolean;
  acceptError: string | null;
}) {
  const hints: Record<string, string> = {
    idle: "Powered by ChatGPT · Gemini · Claude",
    loading: "Evaluando propuestas...",
    result: acceptSuccess
      ? "Contratista adjudicado exitosamente."
      : acceptError
        ? "Error al adjudicar. Puede reintentar o cerrar."
        : "Puede aceptar la recomendación o cerrar y decidir manualmente.",
    error: "Error en la evaluación. Puede reintentar o cambiar de proveedor.",
  };
  return (
    <span className="text-[10px] text-slate-400 font-medium">
      {hints[status] ?? ""}
    </span>
  );
}

function AcceptedBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-emerald-700 bg-emerald-100 rounded-xl border border-emerald-300"
    >
      <CheckCircle className="h-4 w-4" />
      Adjudicado
    </motion.div>
  );
}

function AcceptButton({ onClick }: { onClick: () => Promise<void> }) {
  return (
    <button
      id="btn-accept-ai-recommendation"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
    >
      <CheckCircle className="h-4 w-4" />
      Aceptar recomendación
    </button>
  );
}
