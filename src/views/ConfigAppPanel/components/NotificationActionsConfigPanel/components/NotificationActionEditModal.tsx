/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de edición de una acción notificable — sin campo `key` (no
 * editable, es el identificador técnico que usa AuditLog::record() en el
 * código) ni alta (ver ConfigAppPanel/RoleController-equivalente:
 * NotificationActionController no expone `store`).
 */

import { Bell } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import Select from "@/components/UI/Select";
import { RequiredMark } from "@/components/UI/HintSignals";
import { SCOPE_OPTIONS, STATUS_OPTIONS, type NotificationActionForm } from "@/views/ConfigAppPanel/components/NotificationActionsConfigPanel/types";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary";
const inputClass =
  "w-full rounded-control border border-border-default px-3.5 py-2.5 text-xs font-semibold text-text-secondary placeholder-text-muted outline-hidden focus:border-success-400 focus:ring-2 focus:ring-success-100";

interface NotificationActionEditModalProps {
  isOpen: boolean;
  actionKey: string | null;
  form: NotificationActionForm;
  onFormChange: (form: NotificationActionForm) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function NotificationActionEditModal({
  isOpen,
  actionKey,
  form,
  onFormChange,
  isSaving,
  onClose,
  onSave,
}: NotificationActionEditModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar acción notificable"
      badge="Edición"
      infoLine={actionKey ?? undefined}
      icon={<Bell className="h-5 w-5" />}
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
                <Bell className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="notification-action-label" className={labelClass}>
            Etiqueta
          </label>
          <input
            id="notification-action-label"
            type="text"
            value={form.label}
            onChange={(e) => onFormChange({ ...form, label: e.target.value })}
            maxLength={180}
            placeholder="Dejar vacío para mostrar la clave técnica tal cual"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="notification-action-group" className={labelClass}>
            Grupo <RequiredMark filled={form.group.trim().length > 0} />
          </label>
          <input
            id="notification-action-group"
            type="text"
            value={form.group}
            onChange={(e) => onFormChange({ ...form, group: e.target.value })}
            maxLength={40}
            placeholder="Ej: proyectos, documentos, catalogos"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="notification-action-scope" className={labelClass}>
            Alcance
          </label>
          <Select
            id="notification-action-scope"
            value={form.scope}
            onChange={(v) => onFormChange({ ...form, scope: v as NotificationActionForm["scope"] })}
            options={SCOPE_OPTIONS}
            accent="success"
          />
        </div>

        <div>
          <label htmlFor="notification-action-critical" className={labelClass}>
            Crítica
          </label>
          <Select
            id="notification-action-critical"
            value={form.critical ? "1" : "0"}
            onChange={(v) => onFormChange({ ...form, critical: v === "1" })}
            options={[
              { value: "1", label: "Sí — no admite quedar sin destinatarios en app" },
              { value: "0", label: "No" },
            ]}
            accent="success"
          />
        </div>

        <div>
          <label htmlFor="notification-action-status" className={labelClass}>
            Estado
          </label>
          <Select
            id="notification-action-status"
            value={form.isActive ? "1" : "0"}
            onChange={(v) => onFormChange({ ...form, isActive: v === "1" })}
            options={STATUS_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
            accent="success"
          />
        </div>
      </div>
    </Modal>
  );
}
