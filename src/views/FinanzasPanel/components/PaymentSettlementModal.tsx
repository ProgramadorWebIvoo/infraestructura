/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de pago de Finanzas (anticipo y finiquito): comprobante obligatorio +
 * "¿cómo se pagó?" (moneda cotizada, bolívares u otra moneda, con la tasa real).
 * Orquesta el comprobante, el estado de envío y el formulario de liquidación
 * que antes duplicaban AdvancesSection y FinalSettlementsSection. Al confirmar
 * entrega el importe en moneda base de la orden (lo que valida el backend) y
 * el payload de liquidación.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/UI/Toast";
import { usePaymentSettlement, type SettlementPayload } from "@/hooks/usePaymentSettlement";
import { activeFreezeFor } from "@/hooks/useFrozenBsAmount";
import type { PaymentOrder, Project, RateFreeze } from "@/types";
import { formatPaidAmount } from "@/utils/paymentSettlement";
import PayWithProofModal from "./PayWithProofModal";
import PaymentSettlementForm from "./PaymentSettlementForm";

export interface PaymentTarget {
  projectId: string;
  title: string;
  /** Importe en moneda base a pagar: se usa solo si la orden aún no está disponible. */
  amountBase: number;
  order: PaymentOrder | null;
  /** Tasa congelada al adjudicar (la de la cotización), si la configuración la aplicó. */
  contractFreeze?: RateFreeze;
}

/** Arma el destino del modal para una obra: su orden vigente y la tasa congelada de la cotización. */
export function buildPaymentTarget(project: Project, amountBase: number, order: PaymentOrder | null | undefined): PaymentTarget {
  return {
    projectId: project.id,
    title: project.title,
    amountBase,
    order: order ?? null,
    contractFreeze: activeFreezeFor(project.rateFreezes, "CONTRATADO"),
  };
}

interface PaymentSettlementModalProps {
  target: PaymentTarget | null;
  onClose: () => void;
  /** Devuelve false si el pago no se registró: el modal se queda abierto con el formulario intacto. */
  onConfirm: (projectId: string, amountBase: number, proofFile: File, settlement: SettlementPayload) => Promise<boolean | void>;
  title: string;
  /** Acción en infinitivo para el mensaje: "liberar el anticipo", "aprobar el finiquito". */
  action: string;
  /** Qué ocurre al confirmar: se añade tras la pregunta. */
  consequence: string;
  confirmLabel: string;
  /** Contenido extra bajo el mensaje, sobre el formulario (ej. cantidades finales del cierre). */
  details?: ReactNode;
}

export default function PaymentSettlementModal({ target, onClose, onConfirm, title, action, consequence, confirmLabel, details }: PaymentSettlementModalProps) {
  const { showToast } = useToast();
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [isPaying, setIsPaying] = useState(false);

  const order = target?.order ?? null;
  const obligation = order ? { amount: order.amount, currency: order.currency } : null;
  const settlement = usePaymentSettlement(obligation);
  const { reset } = settlement;

  // Cada obra abre el formulario limpio.
  const projectId = target?.projectId;
  useEffect(() => {
    reset();
    setProofFiles([]);
  }, [projectId, reset]);

  const handleClose = () => {
    setProofFiles([]);
    onClose();
  };

  const handleConfirm = async () => {
    if (!target || proofFiles.length === 0 || !settlement.payload) return;
    setIsPaying(true);
    try {
      const registered = await onConfirm(target.projectId, order?.amountBase ?? target.amountBase, proofFiles[0], settlement.payload);
      if (registered !== false) handleClose();
    } finally {
      setIsPaying(false);
    }
  };

  const message = obligation
    ? `¿Estás seguro de ${action} de ${formatPaidAmount(obligation.amount, obligation.currency)} para la obra "${target?.title ?? ""}"? ${consequence}`
    : `No hay una orden de pago vigente para la obra "${target?.title ?? ""}": no se puede registrar el pago.`;

  return (
    <PayWithProofModal
      isOpen={!!target}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={title}
      message={message}
      details={
        <div className="space-y-4">
          {details}
          {obligation && <PaymentSettlementForm settlement={settlement} obligation={obligation} contractFreeze={target?.contractFreeze} />}
        </div>
      }
      variant="warning"
      confirmLabel={confirmLabel}
      confirmDisabled={!obligation || !settlement.isValid}
      maxWidth="max-w-xl"
      isLoading={isPaying}
      proofFiles={proofFiles}
      onProofFilesChange={setProofFiles}
      onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "warning")}
    />
  );
}
