import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import { useToast } from "@/components/UI/Toast";
import { useClosureReport } from "@/hooks/useClosureReport";
import { getErrorMessage } from "@/services/logger";
import type { ClosureActions } from "@/hooks/projectsWorkflows/useClosureWorkflows";
import type { Project } from "@/types";
import ClosureReportDetail from "./ClosureReportDetail";
import ClosureMeasurementSummary from "./ClosureMeasurementSummary";
import { previewFiniquito } from "./closureMeasurements";

export type ClosureReviewMode = "audit" | "procura";
export type RejectionTarget = "CONTRATISTA" | "RESIDENTE";

interface ModeConfig {
  title: string;
  approveLabel: string;
  rejectLabel: string;
  rejectHint: string;
  approve: (actions: ClosureActions, projectId: string, notes: string) => Promise<void>;
  reject: (actions: ClosureActions, projectId: string, reason: string, target: RejectionTarget) => Promise<void>;
}

const MODES: Record<ClosureReviewMode, ModeConfig> = {
  audit: {
    title: "Verificación de Auditoría",
    approveLabel: "Verificar y enviar a Procura",
    rejectLabel: "Rechazar y devolver al contratista",
    rejectHint: "La obra vuelve a ejecución y el contratista debe corregir y reenviar el informe.",
    approve: (a, id, notes) => a.handleAuditApproval(id, notes || undefined),
    reject: (a, id, reason, target) => a.handleRejectClosure(id, reason, target),
  },
  procura: {
    title: "Solicitud de pago del finiquito",
    approveLabel: "Solicitar pago a Finanzas",
    rejectLabel: "Devolver a Auditoría",
    rejectHint: "Auditoría deberá revisar nuevamente la verificación.",
    approve: (a, id, notes) => a.handleRequestFiniquito(id, notes || undefined),
    reject: (a, id, reason) => a.handleReturnFiniquito(id, reason),
  },
};

interface ClosureReviewModalProps {
  project: Project | null;
  mode: ClosureReviewMode;
  authToken: string;
  actions: ClosureActions;
  /** Solo lectura: muestra el informe sin acciones. */
  readOnly?: boolean;
  onClose: () => void;
}

const TARGET_OPTIONS: { value: RejectionTarget; label: string; hint: string }[] = [
  { value: "CONTRATISTA", label: "Devolver al contratista", hint: "El informe está mal: la obra vuelve a ejecución y el contratista lo corrige y reenvía." },
  { value: "RESIDENTE", label: "Devolver al residente", hint: "La medición está en duda: se borran las mediciones y el residente debe volver a verificar en obra." },
];

export default function ClosureReviewModal({ project, mode, authToken, actions, readOnly = false, onClose }: ClosureReviewModalProps) {
  const config = MODES[mode];
  const { showToast } = useToast();
  const { report, isLoading } = useClosureReport(project?.id ?? null, authToken);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState<RejectionTarget>("CONTRATISTA");
  const [rejecting, setRejecting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const close = () => {
    setNotes("");
    setReason("");
    setTarget("CONTRATISTA");
    setRejecting(false);
    onClose();
  };

  const finiquitoPreview = useMemo(() => {
    if (!report || mode !== "audit" || !project) return null;
    const winner = project.proposals?.find((p) => p.id === project.selectedProposalId);
    return previewFiniquito({ contractedTotal: winner?.totalCost, advancePaid: project.advancePaidAmount, items: report.items });
  }, [report, mode, project]);

  const rejectHint = mode === "audit" ? TARGET_OPTIONS.find((o) => o.value === target)?.hint : config.rejectHint;
  const rejectLabel = mode === "audit" ? `Rechazar: ${TARGET_OPTIONS.find((o) => o.value === target)?.label.toLowerCase()}` : config.rejectLabel;

  const run = async (action: () => Promise<void>, failMessage: string) => {
    setIsBusy(true);
    try {
      await action();
      close();
    } catch (error) {
      showToast(getErrorMessage(error, failMessage), "error");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      isOpen={project !== null}
      onClose={close}
      closeDisabled={isBusy}
      maxWidth="max-w-4xl"
      title={config.title}
      infoLine={project?.title}
      icon={<CheckCircle2 className="h-5 w-5" />}
      footer={
        readOnly ? (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={close}>Cerrar</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {rejecting ? (
              <>
                <Button variant="secondary" onClick={() => setRejecting(false)} disabled={isBusy}>Volver</Button>
                <Button
                  variant="danger"
                  isLoading={isBusy}
                  disabled={!reason.trim()}
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => project && run(() => config.reject(actions, project.id, reason.trim(), target), "No se pudo registrar el rechazo.")}
                >
                  {rejectLabel}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setRejecting(true)} disabled={isBusy || !report}>
                  {mode === "audit" ? "Rechazar…" : config.rejectLabel}
                </Button>
                <Button
                  colorScheme="emerald"
                  isLoading={isBusy}
                  disabled={!report}
                  onClick={() => project && run(() => config.approve(actions, project.id, notes.trim()), "No se pudo registrar la aprobación.")}
                >
                  {config.approveLabel}
                </Button>
              </>
            )}
          </div>
        )
      }
    >
      <div className="space-y-5">
        <ClosureReportDetail
          report={report}
          isLoading={isLoading}
          showFiniquito
          authToken={authToken}
          disabled={isBusy}
          summary={report && mode === "audit" && !readOnly ? <ClosureMeasurementSummary stage="audit" differences={0} totalItems={report.items.length} finiquitoPreview={finiquitoPreview} /> : undefined}
        />

        {!readOnly && rejecting && mode === "audit" && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-bold text-slate-600">Destino del rechazo</legend>
            {TARGET_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="closure-reject-target" value={option.value} checked={target === option.value} onChange={() => setTarget(option.value)} disabled={isBusy} />
                {option.label}
              </label>
            ))}
          </fieldset>
        )}

        {!readOnly && (
          <div>
            <label htmlFor="closure-review-text" className="mb-1 block text-xs font-bold text-slate-600">
              {rejecting ? "Motivo del rechazo (obligatorio)" : "Notas (opcional)"}
            </label>
            <textarea
              id="closure-review-text"
              value={rejecting ? reason : notes}
              maxLength={1000}
              rows={3}
              onChange={(e) => (rejecting ? setReason(e.target.value) : setNotes(e.target.value))}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
            {rejecting && <p className="mt-1 text-[11px] text-slate-500">{rejectHint}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
