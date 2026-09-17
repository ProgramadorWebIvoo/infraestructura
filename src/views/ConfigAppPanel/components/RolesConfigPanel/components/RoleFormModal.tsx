/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de rol — mismo patrón que
 * ProjectTypeFormModal.
 */

import { Shield } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Select from "@/components/UI/Select";
import NumericInput from "@/components/UI/NumericInput";
import { RequiredMark } from "@/components/UI/HintSignals";
import { STATUS_OPTIONS, type RoleForm } from "@/views/ConfigAppPanel/components/RolesConfigPanel/types";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary";
const inputClass =
  "w-full rounded-control border border-border-default px-3.5 py-2.5 text-xs font-semibold text-text-secondary placeholder-text-muted outline-hidden focus:border-success-400 focus:ring-2 focus:ring-success-100";

interface RoleFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingId: number | null;
  form: RoleForm;
  onFormChange: (form: RoleForm) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function RoleFormModal({
  isOpen,
  mode,
  editingId,
  form,
  onFormChange,
  isSaving,
  onClose,
  onSave,
}: RoleFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nuevo rol" : "Editar rol"}
      badge={mode === "create" ? "Creación" : `Editando #${editingId ?? ""}`}
      infoLine={mode === "edit" ? `ID: ${editingId}` : undefined}
      icon={<Shield className="h-5 w-5" />}
      iconColor="emerald"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant="primary"
            colorScheme="emerald"
            isLoading={isSaving}
          >
            {isSaving ? "Guardando..." : (
              <>
                <Shield className="h-4 w-4" />
                {mode === "create" ? "Crear rol" : "Guardar cambios"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="role-key" className={labelClass}>
            Clave <RequiredMark filled={form.key.trim().length > 0} />
          </label>
          <input
            id="role-key"
            type="text"
            value={form.key}
            onChange={(e) => onFormChange({ ...form, key: e.target.value.toUpperCase() })}
            maxLength={40}
            placeholder="Ej: AUDITORIA"
            disabled={mode === "edit"}
            className={`${inputClass} ${mode === "edit" ? "opacity-60" : ""}`}
          />
          {mode === "edit" && (
            <p className="mt-1 text-[10px] font-medium text-text-tertiary">
              La clave no es editable — es el valor que ya usan usuarios existentes.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role-label" className={labelClass}>
            Etiqueta <RequiredMark filled={form.label.trim().length > 0} />
          </label>
          <input
            id="role-label"
            type="text"
            value={form.label}
            onChange={(e) => onFormChange({ ...form, label: e.target.value })}
            maxLength={120}
            placeholder="Ej: Auditoría"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="role-sort" className={labelClass}>
            Orden de aparición
          </label>
          <NumericInput
            id="role-sort"
            value={form.sortOrder}
            onChange={(v) => onFormChange({ ...form, sortOrder: v === "" ? 0 : Math.round(v) })}
            placeholder="0"
            accent="success"
          />
        </div>

        {mode === "edit" && (
          <div>
            <label htmlFor="role-status" className={labelClass}>
              Estado
            </label>
            <Select
              id="role-status"
              value={form.isActive ? "1" : "0"}
              onChange={(v) => onFormChange({ ...form, isActive: v === "1" })}
              options={STATUS_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
              accent="success"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
