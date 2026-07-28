/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de creación / edición de proveedor — extraído de ProveedoresConfigPanel.
 */

import { useState } from "react";
import { Loader2, Shield, UserCheck, UserCog } from "lucide-react";
import Modal from "../../components/UI/Modal";
import SelectModal from "../../components/UI/SelectModal";
import { STATUS_OPTIONS, type ContractorForm } from "./types";

interface ContractorFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  editingCode: string | null;
  form: ContractorForm;
  onFormChange: (form: ContractorForm) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ContractorFormModal({
  isOpen,
  mode,
  editingCode,
  form,
  onFormChange,
  isSaving,
  onClose,
  onSave,
}: ContractorFormModalProps) {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
      badge={mode === "create" ? "Creación" : `Editando ${editingCode ?? ""}`}
      infoLine={mode === "edit" ? editingCode ?? "" : undefined}
      icon={<UserCog className="h-5 w-5" />}
      iconColor="indigo"
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
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                {mode === "create" ? "Crear proveedor" : "Guardar cambios"}
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
            Nombre / Empresa *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            maxLength={180}
            placeholder="Ej: Construcciones del Sur S.A."
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Specialty */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Especialidad *
          </label>
          <input
            type="text"
            value={form.specialty}
            onChange={(e) => onFormChange({ ...form, specialty: e.target.value })}
            maxLength={180}
            placeholder="Ej: Obra civil, Instalaciones eléctricas..."
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Contact */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Contacto (email/teléfono) *
          </label>
          <input
            type="text"
            value={form.contact}
            onChange={(e) => onFormChange({ ...form, contact: e.target.value })}
            maxLength={180}
            placeholder="Ej: contacto@constructora.com"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Rating + Status inline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Rating (0.0 – 5.0)
            </label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={form.rating}
              onChange={(e) => {
                const v = e.target.value.replace(/[eE]/g, "");
                if (v === "") { onFormChange({ ...form, rating: "" }); return; }
                const val = Math.min(5, Math.max(0, parseFloat(v) || 0));
                onFormChange({ ...form, rating: Math.round(val * 10) / 10 });
              }}
              onKeyDown={(e) => {
                if (e.key === "e" || e.key === "E" || e.key === "-" || e.key === "Subtract") e.preventDefault();
              }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center font-mono text-sm font-black text-amber-600 outline-hidden focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Estado
            </label>
            <SelectModal
              isOpen={isStatusModalOpen}
              onClose={() => setIsStatusModalOpen(false)}
              onOpen={() => setIsStatusModalOpen(true)}
              onSelect={(opt) => onFormChange({ ...form, status: opt.value as ContractorForm["status"] })}
              options={STATUS_OPTIONS}
              selectedValue={form.status}
              allowDeselect={false}
              triggerLabel="Seleccionar estado..."
              title="Seleccionar Estado"
              infoLine={`${STATUS_OPTIONS.length} opciones disponibles`}
              icon={<Shield className="h-5 w-5" />}
              iconColor="amber"
              maxWidth="max-w-md"
              searchPlaceholder="Buscar estado..."
            />
          </div>
        </div>

        {/* Origin hint on create */}
        {mode === "create" && (
          <p className="text-[11px] font-medium text-slate-400 italic">
            <Shield className="inline h-3 w-3 mr-1" />
            El proveedor se registrará con origen "Interno".
          </p>
        )}
      </div>
    </Modal>
  );
}
