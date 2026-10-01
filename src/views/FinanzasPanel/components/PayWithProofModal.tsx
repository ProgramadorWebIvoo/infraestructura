/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de confirmación de pago (anticipo o finiquito) que exige adjuntar el
 * comprobante bancario (imagen o PDF) antes de habilitar la confirmación —
 * compartido entre AdvancesSection y FinalSettlementsSection. No reutiliza
 * ConfirmDialog porque este último no expone un slot para contenido extra
 * (el FileDropZone), solo el mensaje de texto.
 */

import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle, Paperclip } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Spinner from "@/components/UI/Spinner";
import FileDropZone from "@/components/UI/FileDropZone";
import { RequiredMark } from "@/components/UI/HintSignals";
import { useAppGroupSettings } from "@/hooks/useAppGroupSettings";

interface PayWithProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  /** Contenido extra bajo el mensaje (p. ej. resumen de cantidades finales del cierre). */
  details?: ReactNode;
  confirmLabel: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  /** Deshabilita la confirmación aunque haya comprobante (ej. formulario de pago incompleto). */
  confirmDisabled?: boolean;
  /** Ancho del modal (default "max-w-md"). */
  maxWidth?: ComponentProps<typeof Modal>["maxWidth"];
  proofFiles: File[];
  onProofFilesChange: (files: File[]) => void;
  onFileRejected?: (fileName: string, reason: string) => void;
}

const VARIANT_STYLES = {
  danger: { icon: AlertTriangle, iconColor: "rose" as const, confirmBg: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500", badge: "Acción crítica" },
  warning: { icon: AlertTriangle, iconColor: "amber" as const, confirmBg: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500", badge: "Confirmación requerida" },
  info: { icon: CheckCircle, iconColor: "sky" as const, confirmBg: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500", badge: "Confirmación" },
};

export default function PayWithProofModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  confirmLabel,
  variant = "warning",
  isLoading = false,
  confirmDisabled = false,
  maxWidth = "max-w-md",
  proofFiles,
  onProofFilesChange,
  onFileRejected,
}: PayWithProofModalProps) {
  const { maxFileSizeBytes } = useAppGroupSettings();
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;
  const canConfirm = proofFiles.length > 0 && !isLoading && !confirmDisabled;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
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
            className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`cursor-pointer px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2 ${styles.confirmBg}`}
          >
            {isLoading && <Spinner />}
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{message}</p>
      {details && <div className="mb-4">{details}</div>}

      <FileDropZone
        id="payment-proof-file"
        files={proofFiles}
        onFilesChange={onProofFilesChange}
        label="Comprobante de Pago"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        extensionsLabel="PDF, PNG, JPG, WEBP"
        color="emerald"
        fileIcon={<Paperclip className="h-3.5 w-3.5" />}
        required
        requiredIndicator={<RequiredMark filled={proofFiles.length > 0} />}
        maxSizeBytes={maxFileSizeBytes}
        maxFileCount={1}
        onFileRejected={onFileRejected}
      />
    </Modal>
  );
}
