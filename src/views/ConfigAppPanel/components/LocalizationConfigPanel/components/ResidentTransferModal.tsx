/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Traspaso" (F2-R D17): moves every location and open custom work of one
 * resident to another, with a reason. Needed before deactivating, changing
 * the role of, or removing a resident that still has pending work.
 */

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import TextField from "@/components/UI/TextField";
import ResidentSelect from "@/components/ResidentSelect";
import { apiFetch } from "@/services/api";
import { getErrorMessage } from "@/services/logger";

interface ResidentTransferModalProps {
  isOpen: boolean;
  authToken: string;
  onClose: () => void;
  onDone: (moved: { localizations: number; projects: number }) => void;
  onError: (message: string) => void;
}

export default function ResidentTransferModal({ isOpen, authToken, onClose, onDone, onError }: ResidentTransferModalProps) {
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = fromId !== null && toId !== null && fromId !== toId && reason.trim().length >= 3;

  const handleClose = () => {
    if (isSaving) return;
    setFromId(null);
    setToId(null);
    setReason("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const moved = await apiFetch<{ localizations: number; projects: number }>(`/residents/${fromId}/transfer`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ toUserId: toId, reason: reason.trim() }),
      });
      onDone(moved);
      setFromId(null);
      setToId(null);
      setReason("");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo realizar el traspaso."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Traspaso de residente"
      icon={<ArrowRightLeft className="h-5 w-5" />}
      iconColor="emerald"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} variant="primary" colorScheme="emerald" isLoading={isSaving}>
            Realizar traspaso
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-500">
          Reasigna todas las ubicaciones y las obras personalizadas abiertas del residente de origen al de destino. Las obras en curso de esas ubicaciones pasan al nuevo residente.
        </p>
        <div>
          <label htmlFor="transfer-from" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Residente de origen</label>
          <ResidentSelect id="transfer-from" value={fromId} onChange={setFromId} allowEmpty={false} />
        </div>
        <div>
          <label htmlFor="transfer-to" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Residente de destino</label>
          <ResidentSelect id="transfer-to" value={toId} onChange={setToId} allowEmpty={false} excludeId={fromId} />
        </div>
        <TextField id="transfer-reason" label="Motivo" as="textarea" rows={2} value={reason} onChange={setReason} required />
      </div>
    </Modal>
  );
}
