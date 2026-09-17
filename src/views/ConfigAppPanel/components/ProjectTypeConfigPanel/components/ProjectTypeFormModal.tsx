/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de tipo de proyecto — extraído de
 * ProjectTypeConfigPanel, mismo patrón que MaterialFormModal.
 */

import { Hammer } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Select from "@/components/UI/Select";
import NumericInput from "@/components/UI/NumericInput";
import { RequiredMark } from "@/components/UI/HintSignals";
import { STATUS_OPTIONS, type ProjectTypeForm } from "@/views/ConfigAppPanel/components/ProjectTypeConfigPanel/types";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary";
const inputClass =
  "w-full rounded-control border border-border-default px-3.5 py-2.5 text-xs font-semibold text-text-secondary placeholder-text-muted outline-hidden focus:border-success-400 focus:ring-2 focus:ring-success-100";

interface ProjectTypeFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingId: number | null;
  form: ProjectTypeForm;
  onFormChange: (form: ProjectTypeForm) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ProjectTypeFormModal({
  isOpen,
  mode,
  editingId,
  form,
  onFormChange,
  isSaving,
  onClose,
  onSave,
}: ProjectTypeFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nuevo tipo de proyecto" : "Editar tipo de proyecto"}
      badge={mode === "create" ? "Creación" : `Editando #${editingId ?? ""}`}
      infoLine={mode === "edit" ? `ID: ${editingId}` : undefined}
      icon={<Hammer className="h-5 w-5" />}
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
                <Hammer className="h-4 w-4" />
                {mode === "create" ? "Crear tipo" : "Guardar cambios"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="project-type-key" className={labelClass}>
            Clave <RequiredMark filled={form.key.trim().length > 0} />
          </label>
          <input
            id="project-type-key"
            type="text"
            value={form.key}
            onChange={(e) => onFormChange({ ...form, key: e.target.value.toUpperCase() })}
            maxLength={40}
            placeholder="Ej: REMODELACION"
            disabled={mode === "edit"}
            className={`${inputClass} ${mode === "edit" ? "opacity-60" : ""}`}
          />
          {mode === "edit" && (
            <p className="mt-1 text-[10px] font-medium text-text-tertiary">
              La clave no es editable — es el valor que ya usan proyectos existentes.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="project-type-label" className={labelClass}>
            Etiqueta <RequiredMark filled={form.label.trim().length > 0} />
          </label>
          <input
            id="project-type-label"
            type="text"
            value={form.label}
            onChange={(e) => onFormChange({ ...form, label: e.target.value })}
            maxLength={120}
            placeholder="Ej: Remodelación"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="project-type-sort" className={labelClass}>
            Orden de aparición
          </label>
          <NumericInput
            id="project-type-sort"
            value={form.sortOrder}
            onChange={(v) => onFormChange({ ...form, sortOrder: v === "" ? 0 : Math.round(v) })}
            placeholder="0"
            accent="success"
          />
        </div>

        {mode === "edit" && (
          <div>
            <label htmlFor="project-type-status" className={labelClass}>
              Estado
            </label>
            <Select
              id="project-type-status"
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
