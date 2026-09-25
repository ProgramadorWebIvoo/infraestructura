/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crea o edita/reenvía una solicitud de modificación de obra (F3). El costo
 * unitario es el ya aprobado de la partida: se muestra, no se edita (D6).
 */

import { useMemo, useState } from "react";
import { Plus, Trash2, FilePenLine } from "lucide-react";
import type { Project } from "@/types";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Select from "@/components/UI/Select";
import NumericInput from "@/components/UI/NumericInput";
import type { EffectiveQuantity, ModificationPayload, ModificationRequest, ModificationType } from "@/hooks/useProjectModifications";
import { MODIFICATION_TYPE_LABEL, lineError, type DraftLine } from "./modificationUtils";

interface Props {
  project: Project;
  quantities: Record<string, EffectiveQuantity>;
  editing: ModificationRequest | null;
  onClose: () => void;
  onSave: (payload: ModificationPayload, modificationId?: number) => Promise<void>;
}

const EMPTY_LINE: DraftLine = { materialId: "", type: "AUMENTO", quantity: "" };
const TYPE_OPTIONS = (Object.keys(MODIFICATION_TYPE_LABEL) as ModificationType[]).map((value) => ({ value, label: MODIFICATION_TYPE_LABEL[value] }));

export default function ModificationFormModal({ project, quantities, editing, onClose, onSave }: Props) {
  const [reason, setReason] = useState(editing?.reason ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    editing ? editing.items.map((i) => ({ materialId: i.materialId, type: i.type, quantity: Number(i.quantity) })) : [{ ...EMPTY_LINE }],
  );
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const materialOptions = useMemo(
    () => project.materials.filter((m) => m.id).map((m) => ({ value: m.id as string, label: `${m.name} (${m.unit})` })),
    [project.materials],
  );
  const priceOf = (id: string) => project.materials.find((m) => m.id === id)?.estimatedUnitPrice;

  const errors = lines.map((l) => lineError(l, quantities[l.materialId]?.final));
  const reasonError = reason.trim() ? null : "Indique el motivo de la modificación.";
  const valid = !reasonError && errors.every((e) => !e);

  const update = (index: number, patch: Partial<DraftLine>) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async () => {
    setShowErrors(true);
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({ reason: reason.trim(), items: lines.map((l) => ({ materialId: l.materialId, type: l.type, quantity: Number(l.quantity) })) }, editing?.id);
      onClose();
    } catch {
      // El padre ya notificó el error; el modal queda abierto para corregir.
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
      title={editing ? "Editar y reenviar modificación" : "Nueva modificación de obra"}
      infoLine={project.title}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} isLoading={saving}>{editing ? "Reenviar a Auditoría" : "Enviar a Auditoría"}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {editing?.rejectionReason && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="font-bold">Motivo del rechazo:</span> {editing.rejectionReason}
          </p>
        )}
        <div>
          <label htmlFor="mod-reason" className="mb-1 block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Motivo</label>
          <textarea
            id="mod-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          {showErrors && reasonError && <p className="mt-1 text-[11px] text-rose-600">{reasonError}</p>}
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => {
            const q = quantities[line.materialId];
            const price = priceOf(line.materialId);
            return (
              <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_9rem_7rem_auto] sm:items-center">
                  <Select value={line.materialId} onChange={(v) => update(index, { materialId: v })} options={materialOptions} ariaLabel="Partida" size="sm" />
                  <Select value={line.type} onChange={(v) => update(index, { type: v as ModificationType })} options={TYPE_OPTIONS} ariaLabel="Tipo" size="sm" />
                  <NumericInput value={line.quantity} onChange={(v) => update(index, { quantity: v })} placeholder="Cantidad" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                  <button type="button" aria-label="Quitar línea" disabled={lines.length === 1} onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {q && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Contratado {q.contracted} · Modificado {q.modification >= 0 ? "+" : ""}{q.modification} · Vigente {q.final}
                    {price !== undefined && <> · Costo unitario aprobado ${price}</>}
                  </p>
                )}
                {showErrors && errors[index] && <p className="mt-1 text-[11px] text-rose-600">{errors[index]}</p>}
              </div>
            );
          })}
          <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>Agregar partida</Button>
        </div>
      </div>
    </Modal>
  );
}
