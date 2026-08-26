/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de rechazo de una petición desde el wizard de revisión técnica de
 * Cierre de Obra. Extraído de TechnicalReviewSection.tsx para que cada
 * modal maneje su propio estado (motivo/observaciones/adjuntos) en vez de
 * que el orquestador cargue con todo — la petición vuelve a Infraestructura
 * (mismo Project.id) para corrección y reenvío, no crea una nueva.
 */

import { useState } from "react";
import { AlertTriangle, XCircle } from "lucide-react";
import type { Project } from "../../../types";
import { useToast } from "../../../components/UI/Toast";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import FileDropZone from "../../../components/UI/FileDropZone";
import { RequiredMark } from "../../../components/UI/HintSignals";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { useAppGroupSettings } from "../../../hooks/useAppGroupSettings";

interface RejectProjectModalProps {
  project: Project | undefined;
  isOpen: boolean;
  onClose: () => void;
  onRejectProject: (
    projectId: string,
    reason: string,
    observations?: string,
    correctionFiles?: File[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onRejected: () => void;
}

export default function RejectProjectModal({ project, isOpen, onClose, onRejectProject, onRejected }: RejectProjectModalProps) {
  const { showToast } = useToast();
  const { maxFileSizeBytes, maxFileCount } = useAppGroupSettings();
  const [reason, setReason] = useState("");
  const [observations, setObservations] = useState("");
  const [correctionFiles, setCorrectionFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const danger = SEMANTIC_COLOR_MAP.danger;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setObservations("");
    setCorrectionFiles([]);
    onClose();
  };

  const handleConfirm = async () => {
    if (!project || !reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRejectProject(project.id, reason.trim(), observations.trim(), correctionFiles);
      setReason("");
      setObservations("");
      setCorrectionFiles([]);
      onRejected();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
      icon={<AlertTriangle className="h-5 w-5" />}
      iconColor="rose"
      badge="Rechazo de petición"
      title={project ? `Rechazar ${project.id}` : ""}
      infoLine={project ? project.title : ""}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            id="btn-confirm-reject-project"
            variant="primary"
            colorScheme="rose"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
            isLoading={isSubmitting}
            icon={<XCircle className="h-3.5 w-3.5" />}
          >
            {isSubmitting ? "Rechazando..." : "Confirmar rechazo"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className={`text-xs ${danger.text600}/80 font-medium leading-relaxed`}>
          La petición volverá a Infraestructura para que corrija lo indicado y la reenvíe. No se crea una petición nueva.
        </p>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="reject-project-reason" className={`text-[10px] font-bold uppercase tracking-wider ${danger.text600}`}>
              Motivo del rechazo
            </label>
            <RequiredMark filled={!!reason.trim()} />
          </div>
          <textarea
            id="reject-project-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej. La descripción no detalla el alcance del trabajo. Los materiales cargados no corresponden al tipo de obra."
            className="w-full rounded-xl border border-danger-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-danger-400 focus:ring-2 focus:ring-danger-100 resize-none"
          />
          <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{reason.length}/500</span>
        </div>

        <div>
          <label htmlFor="reject-project-observations" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Observaciones (opcional)
          </label>
          <textarea
            id="reject-project-observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Detalles adicionales para Infraestructura, aparte del motivo principal."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
          />
          <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{observations.length}/1000</span>
        </div>

        <FileDropZone
          files={correctionFiles}
          onFilesChange={setCorrectionFiles}
          label="Correcciones (opcional)"
          accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          extensionsLabel=".pdf · .dwg · .dxf · .png · .jpg · .xlsx · .csv"
          color="rose"
          icon={<AlertTriangle className="h-6 w-6 text-slate-400" />}
          fileIcon={<AlertTriangle className="h-3.5 w-3.5" />}
          id="reject-project-corrections-upload"
          maxSizeBytes={maxFileSizeBytes}
          maxFileCount={maxFileCount}
          onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
        />
      </div>
    </Modal>
  );
}
