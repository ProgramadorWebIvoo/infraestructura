/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de material — extraído de MaterialConfigPanel.
 */

import { useState } from "react";
import { Package } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import SelectModal from "../../../components/UI/SelectModal";
import NumericInput from "../../../components/UI/NumericInput";
import { RequiredMark } from "../../../components/UI/HintSignals";
import { STATUS_OPTIONS, type MaterialForm } from "../types";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary";
const inputClass =
  "w-full rounded-control border border-border-default px-3.5 py-2.5 text-xs font-semibold text-text-secondary placeholder-text-muted outline-hidden focus:border-success-400 focus:ring-2 focus:ring-success-100";

interface MaterialFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingId: number | null;
  form: MaterialForm;
  onFormChange: (form: MaterialForm) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function MaterialFormModal({
  isOpen,
  mode,
  editingId,
  form,
  onFormChange,
  isSaving,
  onClose,
  onSave,
}: MaterialFormModalProps) {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nuevo material" : "Editar material"}
      badge={mode === "create" ? "Creación" : `Editando #${editingId ?? ""}`}
      infoLine={mode === "edit" ? `ID: ${editingId}` : undefined}
      icon={<Package className="h-5 w-5" />}
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
                <Package className="h-4 w-4" />
                {mode === "create" ? "Crear material" : "Guardar cambios"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="material-name" className={labelClass}>
            Nombre <RequiredMark filled={form.name.trim().length > 0} />
          </label>
          <input
            id="material-name"
            type="text"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            maxLength={180}
            placeholder="Ej: Cemento Portland (Saco 42.5kg)"
            className={inputClass}
          />
        </div>

        {/* Unit + Price inline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="material-unit" className={labelClass}>
              Unidad <RequiredMark filled={form.unit.trim().length > 0} />
            </label>
            <input
              id="material-unit"
              type="text"
              value={form.unit}
              onChange={(e) => onFormChange({ ...form, unit: e.target.value })}
              maxLength={80}
              placeholder="Ej: Saco, m3, Unidad"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="material-price" className={labelClass}>
              Precio unitario est. ($) <RequiredMark filled={form.estimatedUnitPrice !== "" && form.estimatedUnitPrice > 0} />
            </label>
            <NumericInput
              id="material-price"
              value={form.estimatedUnitPrice}
              onChange={(v) => onFormChange({ ...form, estimatedUnitPrice: v === "" ? "" : Math.round(v * 100) / 100 })}
              placeholder="0.00"
              accent="success"
              className="text-center font-black text-success-600"
            />
          </div>
        </div>

        {/* Status toggle only in edit mode */}
        {mode === "edit" && (
          <div>
            <label className={labelClass}>
              Estado
            </label>
            <SelectModal
              isOpen={isStatusModalOpen}
              onClose={() => setIsStatusModalOpen(false)}
              onOpen={() => setIsStatusModalOpen(true)}
              onSelect={(opt) => onFormChange({ ...form, isActive: opt.value === 1 })}
              options={STATUS_OPTIONS}
              selectedValue={form.isActive ? 1 : 0}
              allowDeselect={false}
              triggerLabel={form.isActive ? "Activo" : "Inactivo"}
              title="Seleccionar Estado"
              infoLine={`${STATUS_OPTIONS.length} opciones disponibles`}
              icon={<Package className="h-5 w-5" />}
              iconColor="emerald"
              maxWidth="max-w-md"
              searchPlaceholder="Buscar estado..."
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
