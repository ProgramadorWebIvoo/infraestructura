/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Cambiar residente" of a custom-location work (F2-R D14): only Auditoría /
 * ADMIN, always with a reason. Registered locations change resident from the
 * location itself (Configuración → Ubicaciones).
 */

import { useState } from "react";
import { HardHat } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import TextField from "@/components/UI/TextField";
import ResidentSelect from "@/components/ResidentSelect";
import type { Project } from "@/types";

interface ChangeResidentModalProps {
  project: Project | null;
  onClose: () => void;
  /** Resolves when the change was saved; rejects (already reported by the caller) to keep the modal open. */
  onSubmit: (projectId: string, residentUserId: number, reason: string) => Promise<void>;
}

export default function ChangeResidentModal({ project, onClose, onSubmit }: ChangeResidentModalProps) {
  const [residentId, setResidentId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = residentId !== null && residentId !== project?.residentUserId && reason.trim().length >= 3;

  const reset = () => {
    setResidentId(null);
    setReason("");
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!project || !canSubmit || residentId === null) return;
    setIsSaving(true);
    try {
      await onSubmit(project.id, residentId, reason.trim());
      reset();
      onClose();
    } catch {
      // the caller already reported the error; keep the modal open to retry
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!project}
      onClose={handleClose}
      title="Cambiar residente"
      infoLine={project ? `${project.id} · ${project.title}` : undefined}
      icon={<HardHat className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} variant="primary" colorScheme="sky" isLoading={isSaving}>
            Cambiar residente
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-500">
          Residente actual: <strong className="text-slate-700">{project?.residentName ?? "Sin asignar"}</strong>
        </p>
        <div>
          <label htmlFor="change-resident" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nuevo residente</label>
          <ResidentSelect id="change-resident" value={residentId} onChange={setResidentId} allowEmpty={false} excludeId={project?.residentUserId ?? null} />
        </div>
        <TextField id="change-resident-reason" label="Motivo" as="textarea" rows={2} value={reason} onChange={setReason} required />
      </div>
    </Modal>
  );
}
