/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create / edit modal of a registered location. Changing the resident of an
 * existing location asks for a reason (audited, and open works move with it).
 */

import { MapPin } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Select from "@/components/UI/Select";
import TextField from "@/components/UI/TextField";
import ResidentSelect from "@/components/ResidentSelect";
import { LOCALIZATION_TYPE_OPTIONS } from "@/constants/localizations";
import type { LocalizationType } from "@/types";
import type { LocalizationForm } from "../types";

interface LocalizationFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  form: LocalizationForm;
  onFormChange: (form: LocalizationForm) => void;
  /** Resident saved on the server (edit mode) — a different choice requires a reason. */
  originalResidentId: number | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function LocalizationFormModal({ isOpen, mode, form, onFormChange, originalResidentId, isSaving, onClose, onSave }: LocalizationFormModalProps) {
  const residentChanged = mode === "edit" && originalResidentId !== null && form.residentUserId !== originalResidentId;
  const set = (patch: Partial<LocalizationForm>) => onFormChange({ ...form, ...patch });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nueva ubicación" : "Editar ubicación"}
      badge={mode === "create" ? "Creación" : "Edición"}
      icon={<MapPin className="h-5 w-5" />}
      iconColor="emerald"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={onSave} disabled={isSaving} variant="primary" colorScheme="emerald" isLoading={isSaving}>
            {isSaving ? "Guardando..." : mode === "create" ? "Crear ubicación" : "Guardar cambios"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField id="loc-title" label="Título" placeholder="Ej. Tienda Centro" value={form.title} onChange={(v) => set({ title: v })} required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField id="loc-city" label="Ciudad" placeholder="Ej. Valencia" value={form.city} onChange={(v) => set({ city: v })} required />
          <TextField id="loc-region" label="Estado / región" placeholder="Ej. Carabobo" value={form.region} onChange={(v) => set({ region: v })} />
        </div>
        <TextField id="loc-address" label="Dirección" placeholder="Av. Principal, Zona Industrial" value={form.address} onChange={(v) => set({ address: v })} />

        <div>
          <label htmlFor="loc-type" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo</label>
          <Select id="loc-type" accent="success" value={form.type} onChange={(v) => set({ type: v as LocalizationType })} options={LOCALIZATION_TYPE_OPTIONS} />
        </div>

        <div>
          <label htmlFor="loc-resident" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Residente (obligatorio)</label>
          <ResidentSelect id="loc-resident" value={form.residentUserId} onChange={(id) => set({ residentUserId: id })} allowEmpty={false} />
          <p className="mt-1 text-[10px] font-medium text-slate-400">Las obras en curso de esta ubicación pasan al nuevo residente si lo cambias.</p>
        </div>

        {residentChanged && (
          <TextField id="loc-reason" label="Motivo del cambio de residente" as="textarea" rows={2} value={form.reason} onChange={(v) => set({ reason: v })} required />
        )}

        <TextField id="loc-notes" label="Notas" as="textarea" rows={2} value={form.notes} onChange={(v) => set({ notes: v })} />

        {mode === "edit" && (
          <div>
            <label htmlFor="loc-status" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</label>
            <Select
              id="loc-status"
              accent="success"
              value={form.isActive ? "1" : "0"}
              onChange={(v) => set({ isActive: v === "1" })}
              options={[{ value: "1", label: "Activa" }, { value: "0", label: "Inactiva" }]}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
