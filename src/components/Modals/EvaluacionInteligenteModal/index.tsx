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
import Modal from "@/components/UI/Modal";
import type { Project, Proposal } from "@/types";
import {
  evaluateProposals,
  getAIEvaluationStatus,
  AIEvaluationResult,
  type AIProviderUsed,
} from "@/services/aiEvaluationService";
import { createEchoClient } from "@/services/echo";
import { PROVIDER_META } from "./constants";
import IdleView from "./IdleView";
import LoadingView from "./LoadingView";
import ResultView from "./ResultView";
import ErrorView from "./ErrorView";
import { formatProposalDuration } from "@/views/AnalistasPanel/components/RegisterProposalModal";

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
  /** Vista previa de Analistas (antes de enviar el cuadro a Procura): oculta
   * el botón "Adjudicar" — esa decisión sigue siendo exclusiva de Procura. */
  readOnly?: boolean;
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
  readOnly = false,
}: EvaluacionInteligenteModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [result, setResult] = useState<AIEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [failoverLog, setFailoverLog] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<"auto" | AIProviderUsed>("auto");
  const logEndRef = useRef<HTMLDivElement>(null);

  // La evaluación corre en background (Job en cola, ver aiEvaluationService.ts)
  // — estas refs sostienen la suscripción WebSocket + el polling de respaldo
  // que "esperan" el resultado sin bloquear el hilo principal del navegador.
  const pollTimerRef = useRef<number | null>(null);
  const echoCleanupRef = useRef<(() => void) | null>(null);

  const stopWatchingEvaluation = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (echoCleanupRef.current) {
      echoCleanupRef.current();
      echoCleanupRef.current = null;
    }
  }, []);

  // Cortar WS/polling si el modal se desmonta con una evaluación en curso.
  useEffect(() => () => stopWatchingEvaluation(), [stopWatchingEvaluation]);

  // Al abrir: si hay una evaluación cacheada para este expediente (no
  // invalidada por cambios posteriores al cuadro comparativo), se muestra
  // directamente en vez de forzar una nueva llamada a IA — solo "Re-evaluar"
  // dispara una nueva.
  useEffect(() => {
    if (isOpen) {
      const cached = project.bidEvaluationAi;
      if (cached) {
        setResult({
          winnerContractorCode: cached.winnerContractorCode,
          winnerContractorName: cached.winnerContractorName,
          confidenceScore: cached.confidenceScore,
          summary: cached.summary,
          strengths: cached.strengths,
          weaknesses: cached.weaknesses,
          riskFactors: cached.riskFactors,
          recommendation: cached.recommendation,
          providerUsed: cached.providerUsed,
        });
        setStatus("result");
      } else {
        setStatus("idle");
        setResult(null);
      }
      setErrorMsg("");
      setFailoverLog([]);
      setAcceptSuccess(false);
      setAcceptError(null);
    }
  }, [isOpen, project.bidEvaluationAi]);

  // Auto-scroll del log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [failoverLog]);

  // --- Esperar el resultado del Job en background ---
  // WebSocket (Pusher) para resolución instantánea + polling de respaldo
  // cada 3s (por si el navegador no soporta WS, la key de Pusher no está
  // configurada, o el evento se pierde) — el primero que llegue gana, ver
  // stopWatchingEvaluation().
  const watchEvaluation = useCallback(
    (projectId: string, log: (msg: string) => void) => {
      stopWatchingEvaluation();

      const settle = (
        outcome: "completed" | "failed",
        data: AIEvaluationResult | null,
        error: string | null,
      ) => {
        stopWatchingEvaluation();
        if (outcome === "completed" && data) {
          log(`✅ Evaluación completada por ${PROVIDER_META[data.providerUsed].label}`);
          setResult(data);
          setStatus("result");
        } else {
          const message = error ?? "Error desconocido al evaluar propuestas.";
          log(`❌ Error: ${message}`);
          setErrorMsg(message);
          setStatus("error");
        }
      };

      const echo = createEchoClient();
      if (echo) {
        const channelName = `project.${projectId}.ai-evaluation`;
        const channel = echo.private(channelName);
        channel.listen(
          ".ai-evaluation.finished",
          (payload: { status: "completed" | "failed"; data: AIEvaluationResult | null; error: string | null }) => {
            settle(payload.status, payload.data, payload.error);
          },
        );
        // createEchoClient() abre una conexión Pusher NUEVA cada vez (a
        // diferencia de NotificationsProvider/ExchangeRatesProvider, que
        // mantienen una única conexión de sesión) — leaveChannel() solo deja
        // el canal, no cierra el socket subyacente. Sin disconnect() acá,
        // cada evaluación (abrir modal → evaluar → reintentar) dejaba un
        // WebSocket abierto sin límite hasta cerrar la pestaña (auditoría de
        // rendimiento 2026-09-16, round 3).
        echoCleanupRef.current = () => {
          echo.leaveChannel(channelName);
          echo.disconnect();
        };
      }

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const res = await getAIEvaluationStatus(projectId, authToken);
          if (res.status === "completed" && res.data) {
            settle("completed", res.data, null);
          } else if (res.status === "failed") {
            settle("failed", null, res.error);
          }
        } catch {
          // Silencioso: reintenta en el próximo tick, no corta el WS.
        }
      }, 3000);
    },
    [authToken, stopWatchingEvaluation],
  );

  // --- Ejecutar evaluación ---
  const runEvaluation = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    setFailoverLog([]);

    const log = (msg: string) => setFailoverLog((prev) => [...prev, msg]);

    try {
      const providerParam = selectedProvider === "auto" ? undefined : selectedProvider;

      const startLabel =
        selectedProvider === "auto"
          ? "Automático (Failover: ChatGPT → Gemini → Claude)"
          : PROVIDER_META[selectedProvider].label;

      log(`Iniciando evaluación con ${startLabel}...`);

      await evaluateProposals(project, proposals, authToken, providerParam);
      log("Evaluación encolada — procesando en background...");

      watchEvaluation(project.id, log);
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
  }, [project, proposals, authToken, selectedProvider, watchEvaluation]);

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
    const durationLabels = proposals.map((p) => formatProposalDuration(p)).filter((d) => d !== "Sin dato");
    const durationRangeLabel =
      durationLabels.length === 0
        ? "Sin dato"
        : durationLabels.every((d) => d === durationLabels[0])
          ? durationLabels[0]
          : `${durationLabels[0]} – ${durationLabels[durationLabels.length - 1]}`;
    return {
      proposalCount: proposals.length,
      approvedInvestmentAmount: project.approvedInvestmentAmount,
      durationRangeLabel,
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
            cachedEvaluatedAt={project.bidEvaluationAi?.evaluatedAt ?? null}
          />
          {readOnly ? null : acceptSuccess ? (
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
          durationRangeLabel={idleMetrics.durationRangeLabel}
          proposals={proposals.map((p) => ({
            id: p.id,
            contractorName: p.contractorName,
            materialCost: p.materialCost,
            laborCost: p.laborCost,
            totalCost: p.totalCost,
            durationLabel: formatProposalDuration(p),
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
          winnerDuration={(() => {
            const winner = proposals.find((p) => p.contractorCode === result.winnerContractorCode);
            return winner ? formatProposalDuration(winner) : "Sin dato";
          })()}
          winnerRating={
            proposals.find((p) => p.contractorCode === result.winnerContractorCode)
              ?.contractorRating ?? null
          }
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
  cachedEvaluatedAt,
}: {
  status: string;
  acceptSuccess: boolean;
  acceptError: string | null;
  cachedEvaluatedAt: string | null;
}) {
  const cachedNote = cachedEvaluatedAt
    ? ` · Evaluado el ${new Date(cachedEvaluatedAt).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}`
    : "";
  const hints: Record<string, string> = {
    idle: "Powered by ChatGPT · Gemini · Claude",
    loading: "Evaluando propuestas...",
    result: (acceptSuccess
      ? "Contratista seleccionado. Pendiente de aprobación de Presidencia."
      : acceptError
        ? "Error al adjudicar. Puede reintentar o cerrar."
        : "Puede aceptar la recomendación o cerrar y decidir manualmente.") + cachedNote,
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
