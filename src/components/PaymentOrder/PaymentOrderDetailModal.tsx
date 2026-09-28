/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Detalle de la orden de pago (F4 Bloque B, D11/D18): datos congelados de la
 * orden + documentos del proveedor, todo dentro de la pestaña de Finanzas
 * (sin enlace ni pantalla nueva). Reutiliza ContractorDocumentsSection tal
 * cual (Finanzas solo puede ver/descargar, nunca cargar ni eliminar).
 */

import { FileSignature, Hash, Printer, User } from "lucide-react";
import Modal from "@/components/UI/Modal";
import Button from "@/components/UI/Button";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "@/components/UI/colorTokens";
import ContractorDocumentsSection from "@/components/Contractor/ContractorDocumentsSection";
import PaymentOrderSignatureLine from "./PaymentOrderSignatureLine";
import BsAmount from "@/components/UI/BsAmount";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { formatNumber } from "@/utils";
import { printPaymentOrder } from "@/utils/paymentOrderPrint";
import type { PaymentOrder, PaymentOrderStatus } from "@/types";

interface PaymentOrderDetailModalProps {
  order: PaymentOrder | null;
  onClose: () => void;
  authToken: string;
  activeRole?: string;
  /** Refresca la lista de obras del panel tras firmar (el estado de la orden pudo cambiar a FIRMADA/PAGADA). */
  onOrderSigned?: () => void;
}

const STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  EN_FIRMA: "En firma",
  FIRMADA: "Firmada",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
};

const STATUS_ACCENT: Record<PaymentOrderStatus, SemanticColor> = {
  EN_FIRMA: "warning",
  FIRMADA: "info",
  PAGADA: "success",
  ANULADA: "neutral",
};

export default function PaymentOrderDetailModal({ order, onClose, authToken, activeRole, onOrderSigned }: PaymentOrderDetailModalProps) {
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  if (!order) return null;

  const accent = SEMANTIC_COLOR_MAP[STATUS_ACCENT[order.status]];
  const contractorName = order.snapshot?.contractor?.name ?? order.contractorCode;

  return (
    <Modal
      isOpen={order !== null}
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<FileSignature className="h-5 w-5" />}
      iconColor="rose"
      title={`Orden de pago #${order.number}`}
      infoLine={order.paymentType === "ADVANCE" ? "Anticipo" : "Finiquito"}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => printPaymentOrder(order)}>
            Imprimir orden
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-pill border px-3 py-1 text-xs font-bold ${accent.border100} ${accent.bg50} ${accent.text700}`}>
            {STATUS_LABELS[order.status]}
          </span>
          {order.voidReason && (
            <span className="text-xs font-medium text-text-tertiary">Motivo de anulación: {order.voidReason}</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-control border border-border-default bg-surface-raised p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Proveedor</p>
            <p className="text-sm font-bold text-text-primary">{contractorName}</p>
            <p className="font-mono text-[11px] text-text-tertiary">{order.contractorCode}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Monto</p>
            <p className="text-sm font-black text-text-primary">${formatNumber(order.amount)} {order.currency}</p>
            <BsAmount amount={order.amount} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="block" />
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-text-tertiary" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Elaborado por</p>
              <p className="text-xs font-semibold text-text-primary">{order.elaboratedByName ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-text-tertiary" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Hash de integridad</p>
              <p className="truncate font-mono text-[10px] text-text-tertiary" title={order.contentHash}>{order.contentHash}</p>
            </div>
          </div>
        </div>

        <PaymentOrderSignatureLine orderId={order.id} authToken={authToken} onSigned={onOrderSigned} />

        <ContractorDocumentsSection contractorCode={order.contractorCode} authToken={authToken} activeRole={activeRole} />
      </div>
    </Modal>
  );
}
