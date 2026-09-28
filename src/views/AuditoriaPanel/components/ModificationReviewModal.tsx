/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Revisión de una solicitud de modificación de obra (F3): muestra las
 * diferencias vigente → propuesta por partida y permite aprobar (notas
 * opcionales) o rechazar (motivo obligatorio). Solo las PENDIENTES se deciden.
 */

import { useState } from "react";
import { ArrowRight, Check, FilePenLine, X } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import { useToast } from "@/components/UI/Toast";
import { useProjectModifications } from "@/hooks/useProjectModifications";
import type { InboxModification } from "@/hooks/useModificationInbox";
import { MODIFICATION_TYPE_LABEL, signedQuantity } from "@/views/InfraestructuraMantenimientoPanel/components/modificationUtils";

interface Props {
  request: InboxModification;
  authToken: string;
  onClose: () => void;
  /** Se invoca tras aprobar/rechazar para refrescar la bandeja y las obras. */
  onReviewed: () => void;
}

const TEXTAREA_CLASS = "w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400";

export default function ModificationReviewModal({ request, authToken, onClose, onReviewed }: Props) {
  const { showToast } = useToast();
  const { state, review } = useProjectModifications(request.projectId, authToken);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);

  const pending = request.status === "PENDIENTE";

  const decide = async (approve: boolean) => {
    if (!approve && !reason.trim()) {
      setShowError(true);
      return;
    }
    setSaving(true);
    try {
      await review(request.id, approve ? { approve: true, notes: notes.trim() } : { approve: false, reason: reason.trim() });
      showToast(approve ? "Modificación aprobada." : "Modificación rechazada y devuelta a Infraestructura.", "success");
      onReviewed();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo registrar la decisión.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      closeDisabled={saving}
      icon={<FilePenLine className="h-5 w-5" />}
      iconColor="sky"
      title="Modificación de obra"
      infoLine={`${request.projectId} · ${request.projectTitle ?? ""}`}
      maxWidth="max-w-3xl"
      footer={
        pending ? (
          <div className="flex justify-end gap-2">
            {rejecting ? (
              <>
                <Button variant="secondary" onClick={() => setRejecting(false)} disabled={saving}>Volver</Button>
                <Button variant="danger" icon={<X className="h-4 w-4" />} onClick={() => decide(false)} isLoading={saving}>Confirmar rechazo</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(true)} disabled={saving}>Rechazar</Button>
                <Button icon={<Check className="h-4 w-4" />} onClick={() => decide(true)} isLoading={saving}>Aprobar</Button>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Motivo de Infraestructura</p>
          <p className="mt-1 text-xs text-slate-700">{request.reason}</p>
          {request.requestedByName && <p className="text-[11px] text-slate-400">Solicitada por {request.requestedByName}</p>}
        </div>

        <ul className="space-y-2" aria-label="Diferencias por partida">
          {request.items.map((item) => {
            const q = state?.effectiveQuantities[item.materialId];
            const delta = signedQuantity(item.type, Number(item.quantity));
            return (
              <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <p className="font-bold text-slate-800">{item.name} <span className="font-normal text-slate-500">({item.unit})</span></p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-600">
                  <span>{MODIFICATION_TYPE_LABEL[item.type]} {delta > 0 ? "+" : "−"}{Math.abs(delta)}</span>
                  {q && pending && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>Contratado vigente {q.final}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="font-bold text-slate-800" data-testid={`modification-final-${item.id}`}>{q.final + delta}</span>
                    </>
                  )}
                  {item.unitPriceUsd != null && <span className="text-slate-400">· {formatCurrency(Number(item.unitPriceUsd))} c/u</span>}
                </p>
              </li>
            );
          })}
        </ul>

        {request.netAmountUsd != null && (
          <p className="text-xs text-slate-600">
            Impacto neto en el contratado: <span className="font-mono font-bold">{Number(request.netAmountUsd) >= 0 ? "+" : "−"}{formatCurrency(Math.abs(Number(request.netAmountUsd)))}</span>
          </p>
        )}

        {!pending && request.rejectionReason && <p className="text-xs font-medium text-rose-700">Motivo del rechazo: {request.rejectionReason}</p>}
        {!pending && request.reviewNotes && <p className="text-xs text-slate-600">Notas de Auditoría: {request.reviewNotes}</p>}

        {pending && rejecting && (
          <div>
            <label htmlFor="mod-reject-reason" className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Motivo del rechazo</label>
            <textarea id="mod-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} className={TEXTAREA_CLASS} />
            {showError && !reason.trim() && <p className="mt-1 text-[11px] text-rose-600">Indique el motivo del rechazo.</p>}
          </div>
        )}
        {pending && !rejecting && (
          <div>
            <label htmlFor="mod-approve-notes" className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Notas (opcional)</label>
            <textarea id="mod-approve-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} className={TEXTAREA_CLASS} />
          </div>
        )}
      </div>
    </Modal>
  );
}
