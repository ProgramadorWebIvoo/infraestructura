import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, FileText } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import { useToast } from "@/components/UI/Toast";
import ClosureReportDetail from "@/components/ClosureReport/ClosureReportDetail";
import ClosureFilePreview, { type ClosurePreviewTarget } from "@/components/ClosureReport/ClosureFilePreview";
import ClosureMeasurementSummary from "@/components/ClosureReport/ClosureMeasurementSummary";
import PhotoDropzone from "@/views/CierrePublico/components/PhotoDropzone";
import {
  countDifferences,
  initialDrafts,
  measurementErrors,
  toMeasurementPayload,
  type MeasurementDraft,
  type MeasurementDrafts,
} from "@/components/ClosureReport/closureMeasurements";
import { getErrorMessage } from "@/services/logger";
import type { ResidentDocument, ResidentProject, useResidentProjects } from "@/hooks/useResidentProjects";
import { hasResidentPhoto, toClosureReport, validateResidentPhoto } from "./residentRules";

type ResidentActions = ReturnType<typeof useResidentProjects>;

interface ResidentProjectModalProps {
  project: ResidentProject | null;
  authToken: string;
  actions: Pick<ResidentActions, "approve" | "uploadPhoto" | "deletePhoto" | "loadDocuments">;
  onClose: () => void;
}

export default function ResidentProjectModal({ project, authToken, actions, onClose }: ResidentProjectModalProps) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<MeasurementDrafts>({});
  const [notes, setNotes] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<ResidentDocument[]>([]);
  const [preview, setPreview] = useState<ClosurePreviewTarget | null>(null);

  const report = useMemo(() => (project ? toClosureReport(project) : null), [project]);
  const projectId = project?.id ?? null;
  const revision = project?.closure?.revision;
  const editable = project?.pendingAction ?? false;

  useEffect(() => {
    setDrafts(project?.closure ? initialDrafts(project.closure.items) : {});
    setNotes("");
    setPreview(null);
    // Solo al abrir otra obra o al cambiar de revisión (p. ej. devolución de Auditoría); subir fotos no debe borrar lo digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, revision]);

  const { loadDocuments } = actions;
  useEffect(() => {
    setDocuments([]);
    if (!projectId) return;
    let cancelled = false;
    loadDocuments(projectId)
      .then((docs) => !cancelled && setDocuments(docs))
      .catch(() => !cancelled && setDocuments([]));
    return () => {
      cancelled = true;
    };
  }, [projectId, loadDocuments]);

  const errors = useMemo(() => (report && editable ? measurementErrors(report.items, drafts) : {}), [report, editable, drafts]);
  const needsPhoto = project ? editable && !hasResidentPhoto(project) : false;
  const canApprove = !!report && editable && !needsPhoto && Object.keys(errors).length === 0;

  const handleDraftChange = (itemId: number, patch: Partial<MeasurementDraft>) =>
    setDrafts((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));

  const run = async (action: () => Promise<unknown>, failMessage: string) => {
    setIsBusy(true);
    try {
      await action();
      onClose();
    } catch (error) {
      showToast(getErrorMessage(error, failMessage), "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!project) return;
    setIsUploading(true);
    for (const file of files) {
      const problem = validateResidentPhoto(file);
      if (problem) {
        showToast(problem, "error");
        continue;
      }
      try {
        await actions.uploadPhoto(project.id, file);
      } catch (error) {
        showToast(getErrorMessage(error, "No se pudo subir la foto."), "error");
      }
    }
    setIsUploading(false);
  };

  const previewDocument = (doc: ResidentDocument) =>
    project &&
    setPreview({
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      path: `resident/projects/${project.id}/documents/${doc.id}/preview`,
      downloadPath: `resident/projects/${project.id}/documents/${doc.id}/download`,
    });

  return (
    <Modal
      isOpen={project !== null}
      onClose={onClose}
      closeDisabled={isBusy}
      maxWidth="max-w-4xl"
      title="Informe del residente"
      infoLine={project?.title}
      icon={<CheckCircle2 className="h-5 w-5" />}
      footer={
        !editable ? (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              colorScheme="emerald"
              isLoading={isBusy}
              disabled={!canApprove}
              onClick={() => project && report && run(() => actions.approve(project.id, notes.trim() || undefined, toMeasurementPayload(report.items, drafts)), "No se pudo enviar su informe.")}
            >
              Enviar mi informe a Auditoría
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {project?.closure?.rejectionTarget === "RESIDENTE" && project.closure.rejectionReason && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Auditoría le devolvió su informe: {project.closure.rejectionReason}</p>
        )}
        <ClosureReportDetail
          report={report}
          tableMode={editable ? "resident" : "readonly"}
          drafts={drafts}
          errors={errors}
          onDraftChange={handleDraftChange}
          authToken={authToken}
          disabled={isBusy}
          summary={report && editable ? <ClosureMeasurementSummary stage="resident" differences={countDifferences(report.items, drafts)} totalItems={report.items.length} finiquitoPreview={null} /> : undefined}
        />

        {editable && project && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Fotos de verificación en obra</p>
            <PhotoDropzone
              photos={project.closure?.photos.filter((p) => p.uploadedByType === "RESIDENTE") ?? []}
              editable
              theme="light"
              onPreview={(photo) => setPreview(photo)}
              isUploading={isUploading}
              onFiles={handleFiles}
              onDelete={(photo) => project && actions.deletePhoto(project.id, photo.id).catch((error) => showToast(getErrorMessage(error, "No se pudo eliminar la foto."), "error"))}
            />
            {needsPhoto && <p className="text-[11px] text-amber-700">Adjunte al menos una foto de verificación para enviar su informe.</p>}
          </div>
        )}

        {documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Documentos técnicos</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{doc.originalName}</span>
                  <Button size="sm" variant="secondary" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => previewDocument(doc)}>Ver</Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {editable && (
          <div>
            <label htmlFor="resident-review-text" className="mb-1 block text-xs font-bold text-slate-600">
              Observaciones (opcional)
            </label>
            <textarea
              id="resident-review-text"
              value={notes}
              maxLength={1000}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
          </div>
        )}
      </div>
      <ClosureFilePreview target={preview} authToken={authToken} onClose={() => setPreview(null)} />
    </Modal>
  );
}
