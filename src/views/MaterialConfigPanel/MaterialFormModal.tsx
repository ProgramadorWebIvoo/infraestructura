/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de material — extraído de MaterialConfigPanel.
 */

import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import Modal from "../../components/UI/Modal";
import SelectModal from "../../components/UI/SelectModal";
import { STATUS_OPTIONS, type MaterialForm } from "./types";

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
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:shadow-md disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                {mode === "create" ? "Crear material" : "Guardar cambios"}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Nombre *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            maxLength={180}
            placeholder="Ej: Cemento Portland (Saco 42.5kg)"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Unit + Price inline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Unidad *
            </label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => onFormChange({ ...form, unit: e.target.value })}
              maxLength={80}
              placeholder="Ej: Saco, m3, Unidad"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Precio unitario est. ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.estimatedUnitPrice}
              onChange={(e) => {
                const v = e.target.value.replace(/[eE]/g, "");
                if (v === "") { onFormChange({ ...form, estimatedUnitPrice: "" }); return; }
                const val = Math.max(0, parseFloat(v) || 0);
                onFormChange({ ...form, estimatedUnitPrice: Math.round(val * 100) / 100 });
              }}
              onKeyDown={(e) => {
                if (e.key === "e" || e.key === "E" || e.key === "-" || e.key === "Subtract") e.preventDefault();
              }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center font-mono text-sm font-black text-emerald-600 outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {/* Status toggle only in edit mode */}
        {mode === "edit" && (
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Estado
            </label>
            <SelectModal
              isOpen={isStatusModalOpen}
              onClose={() => setIsStatusModalOpen(false)}
              onOpen={() => setIsStatusModalOpen(true)}
              onSelect={(opt) => onFormChange({ ...form, isActive: opt.value === 1 })}
              options={STATUS_OPTIONS}
              selectedValue={form.isActive ? 1 : 0}
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
