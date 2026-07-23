/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ConfirmDialog — Modal de confirmación reutilizable para acciones destructivas.
 * Centraliza el patrón de "¿Estás seguro?" con resumen de la acción.
 */

import { AlertTriangle, CheckCircle } from "lucide-react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const VARIANT_STYLES = {
  danger: {
    icon: AlertTriangle,
    iconColor: "rose" as const,
    confirmBg: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500",
    badge: "Acción crítica",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "amber" as const,
    confirmBg: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    badge: "Confirmación requerida",
  },
  info: {
    icon: CheckCircle,
    iconColor: "sky" as const,
    confirmBg: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500",
    badge: "Confirmación",
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      icon={<Icon className="h-5 w-5" />}
      iconColor={styles.iconColor}
      title={title}
      badge={styles.badge}
      closeDisabled={isLoading}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2 ${styles.confirmBg}`}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
}
