/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de envío a reevaluación desde el wizard de autorización de inversión
 * de Procura — mismo patrón de RejectProjectModal.tsx (Auditoría): un
 * motivo obligatorio, observaciones y evidencia opcionales. El expediente
 * vuelve a Auditoría (mismo Project.id, sin crear uno nuevo) para que
 * corrija lo señalado y lo reenvíe a Procura.
 */

import { useState } from "react";
import { AlertTriangle, Undo2 } from "lucide-react";
import type { Project } from "@/types";
import { useToast } from "@/components/UI/Toast";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import FileDropZone from "@/components/UI/FileDropZone";
import { RequiredMark } from "@/components/UI/HintSignals";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useAppGroupSettings } from "@/hooks/useAppGroupSettings";

interface ReevaluationModalProps {
  project: Project | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSendToReevaluation: (
    projectId: string,
    reason: string,
    observations?: string,
    evidenceFiles?: File[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onSent: () => void;
}

export default function ReevaluationModal({ project, isOpen, onClose, onSendToReevaluation, onSent }: ReevaluationModalProps) {
  const { showToast } = useToast();
  const { maxFileSizeBytes, maxFileCount } = useAppGroupSettings();
  const [reason, setReason] = useState("");
  const [observations, setObservations] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const warning = SEMANTIC_COLOR_MAP.warning;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setObservations("");
    setEvidenceFiles([]);
    onClose();
  };

  const handleConfirm = async () => {
    if (!project || !reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSendToReevaluation(project.id, reason.trim(), observations.trim(), evidenceFiles);
      setReason("");
      setObservations("");
      setEvidenceFiles([]);
      onSent();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
      icon={<Undo2 className="h-5 w-5" />}
      iconColor="amber"
      badge="Reevaluación de Auditoría"
      title={project ? `Enviar a reevaluación ${project.id}` : ""}
      infoLine={project ? project.title : ""}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            id="btn-confirm-send-reevaluation"
            variant="primary"
            colorScheme="amber"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
            isLoading={isSubmitting}
            icon={<Undo2 className="h-3.5 w-3.5" />}
          >
            {isSubmitting ? "Enviando..." : "Confirmar envío a reevaluación"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className={`text-xs ${warning.text600}/80 font-medium leading-relaxed`}>
          El expediente volverá a Auditoría para que corrija lo indicado y lo reenvíe a Procura. No se crea un expediente nuevo.
        </p>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="reevaluation-reason" className={`text-[10px] font-bold uppercase tracking-wider ${warning.text600}`}>
              Motivo de la reevaluación
            </label>
            <RequiredMark filled={!!reason.trim()} />
          </div>
          <textarea
            id="reevaluation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej. La cubicación de materiales no coincide con los planos adjuntos. Se requiere revisar el cálculo antes de autorizar inversión."
            className="w-full rounded-xl border border-warning-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-warning-400 focus:ring-2 focus:ring-warning-100 resize-none"
          />
          <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{reason.length}/500</span>
        </div>

        <div>
          <label htmlFor="reevaluation-observations" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Observaciones (opcional)
          </label>
          <textarea
            id="reevaluation-observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Detalles adicionales para Auditoría, aparte del motivo principal."
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
          />
          <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{observations.length}/1000</span>
        </div>

        <FileDropZone
          files={evidenceFiles}
          onFilesChange={setEvidenceFiles}
          label="Evidencia (opcional)"
          accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          extensionsLabel=".pdf · .dwg · .dxf · .png · .jpg · .xlsx · .csv"
          color="indigo"
          icon={<AlertTriangle className="h-6 w-6 text-slate-400" />}
          fileIcon={<AlertTriangle className="h-3.5 w-3.5" />}
          id="reevaluation-evidence-upload"
          maxSizeBytes={maxFileSizeBytes}
          maxFileCount={maxFileCount}
          onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
        />
      </div>
    </Modal>
  );
}
