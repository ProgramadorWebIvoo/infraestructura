import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, ImagePlus, XCircle } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import { useToast } from "@/components/UI/Toast";
import { useClosureReport } from "@/hooks/useClosureReport";
import { getErrorMessage } from "@/services/logger";
import type { ClosureActions } from "@/hooks/projectsWorkflows/useClosureWorkflows";
import type { Project } from "@/types";
import ClosureReportDetail from "./ClosureReportDetail";
import ClosureMeasurementSummary from "./ClosureMeasurementSummary";
import {
  countDifferences,
  initialDrafts,
  measurementErrors,
  previewFiniquito,
  toMeasurementPayload,
  type MeasurementDraft,
  type MeasurementDrafts,
} from "./closureMeasurements";
import { CLOSURE_PHOTO_MAX_BYTES, CLOSURE_PHOTO_MIMES, type ClosureReport } from "./types";

export type ClosureReviewMode = "resident" | "audit" | "procura";

interface ModeConfig {
  title: string;
  approveLabel: string;
  rejectLabel: string;
  rejectHint: string;
  approve: (actions: ClosureActions, projectId: string, notes: string, drafts: MeasurementDrafts, report: ClosureReport) => Promise<void>;
  reject: (actions: ClosureActions, projectId: string, reason: string) => Promise<void>;
}

const MODES: Record<ClosureReviewMode, ModeConfig> = {
  resident: {
    title: "Corroborar ejecución de la obra",
    approveLabel: "Dar visto bueno y pasar a Auditoría",
    rejectLabel: "Rechazar y devolver al contratista",
    rejectHint: "El contratista recibirá el motivo por correo y podrá corregir y reenviar el informe.",
    approve: (a, id, notes, drafts, report) => a.handleResidentApproval(id, notes || undefined, toMeasurementPayload(report.items, drafts, "resident")),
    reject: (a, id, reason) => a.handleRejectClosure(id, reason),
  },
  audit: {
    title: "Verificación independiente de Auditoría",
    approveLabel: "Verificar y enviar a Procura",
    rejectLabel: "Rechazar y devolver al contratista",
    rejectHint: "La obra vuelve a ejecución y el contratista debe corregir y reenviar el informe.",
    approve: (a, id, notes, drafts, report) => a.handleAuditApproval(id, notes || undefined, toMeasurementPayload(report.items, drafts, "audit")),
    reject: (a, id, reason) => a.handleRejectClosure(id, reason),
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
  /** Solo lectura: muestra el informe sin acciones (p. ej. residente distinto al asignado). */
  readOnly?: boolean;
  onClose: () => void;
}

export default function ClosureReviewModal({ project, mode, authToken, actions, readOnly = false, onClose }: ClosureReviewModalProps) {
  const config = MODES[mode];
  const { showToast } = useToast();
  const { report, isLoading, reload } = useClosureReport(project?.id ?? null, authToken);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const close = () => {
    setNotes("");
    setReason("");
    setRejecting(false);
    onClose();
  };

  const stage = mode === "resident" || mode === "audit" ? mode : null;
  const measuring = stage !== null && !readOnly;
  const [drafts, setDrafts] = useState<MeasurementDrafts>({});

  useEffect(() => {
    if (report && stage) setDrafts(initialDrafts(report.items, stage));
  }, [report, stage]);

  const errors = useMemo(() => (report && measuring && stage ? measurementErrors(report.items, drafts, stage) : {}), [report, measuring, stage, drafts]);
  const hasErrors = Object.keys(errors).length > 0;

  const handleDraftChange = (itemId: number, patch: Partial<MeasurementDraft>) =>
    setDrafts((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));

  const finiquitoPreview = useMemo(() => {
    if (!report || mode !== "audit" || !project) return null;
    const winner = project.proposals?.find((p) => p.id === project.selectedProposalId);
    return previewFiniquito({ contractedTotal: winner?.totalCost, advancePaid: project.advancePaidAmount, items: report.items, drafts });
  }, [report, mode, project, drafts]);

  const hasResidentPhoto = report?.photos.some((p) => p.uploadedByType === "RESIDENTE") ?? false;
  const needsPhoto = mode === "resident" && !hasResidentPhoto;

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

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !project) return;
    if (!CLOSURE_PHOTO_MIMES.includes(file.type) || file.size > CLOSURE_PHOTO_MAX_BYTES) {
      showToast("Solo imágenes JPG, PNG o WEBP de máximo 5 MB.", "error");
      return;
    }
    try {
      await actions.handleUploadResidentPhoto(project.id, file);
      await reload();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo subir la foto."), "error");
    }
  };

  return (
    <Modal
      isOpen={project !== null}
      onClose={close}
      closeDisabled={isBusy}
      maxWidth={mode === "audit" ? "max-w-6xl" : "max-w-4xl"}
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
                  onClick={() => project && run(() => config.reject(actions, project.id, reason.trim()), "No se pudo registrar el rechazo.")}
                >
                  {config.rejectLabel}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setRejecting(true)} disabled={isBusy || !report}>{config.rejectLabel}</Button>
                <Button
                  colorScheme="emerald"
                  isLoading={isBusy}
                  disabled={!report || needsPhoto || (measuring && hasErrors)}
                  onClick={() => project && report && run(() => config.approve(actions, project.id, notes.trim(), drafts, report), "No se pudo registrar la aprobación.")}
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
          showFiniquito={mode !== "resident"}
          tableMode={measuring && stage ? stage : "readonly"}
          drafts={drafts}
          errors={errors}
          onDraftChange={handleDraftChange}
          disabled={isBusy}
          summary={
            measuring && stage && report ? (
              <ClosureMeasurementSummary
                stage={stage}
                differences={countDifferences(report.items, drafts, stage)}
                totalItems={report.items.length}
                finiquitoPreview={finiquitoPreview}
              />
            ) : undefined
          }
        />

        {!readOnly && mode === "resident" && (
          <div className="space-y-2">
            <input ref={fileInput} type="file" accept={CLOSURE_PHOTO_MIMES.join(",")} className="hidden" onChange={handlePhoto} />
            <Button size="sm" variant="secondary" icon={<ImagePlus className="h-3.5 w-3.5" />} onClick={() => fileInput.current?.click()}>
              Adjuntar foto de verificación en obra
            </Button>
            {needsPhoto && <p className="text-[11px] text-amber-700">Adjunte al menos una foto de verificación para dar el visto bueno.</p>}
          </div>
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
            {rejecting && <p className="mt-1 text-[11px] text-slate-500">{config.rejectHint}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
