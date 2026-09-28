/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Línea de firmas de la orden de pago (F4 Bloque C): cada paso configurado
 * con su estado (firmado / próximo / pendiente) y, si le toca al usuario
 * actual, el botón "Firmar" con confirmación simple (D14: sin reconfirmar
 * contraseña). Sin pasos configurados, no renderiza nada (D2).
 */

import { useCallback, useEffect, useState } from "react";
import { Check, CircleDashed, FileSignature, ShieldAlert } from "lucide-react";
import Button from "@/components/UI/Button";
import Spinner from "@/components/UI/Spinner";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage, logError } from "@/services/logger";
import { fetchPaymentOrder, signPaymentOrder } from "@/services/paymentOrders";
import type { PaymentOrderDetail } from "@/types";

interface PaymentOrderSignatureLineProps {
  orderId: number;
  authToken: string;
  /** Se invoca tras firmar, para que el padre refresque el estado de la orden (puede pasar a FIRMADA/PAGADA). */
  onSigned?: () => void;
}

const success = SEMANTIC_COLOR_MAP.success;
const info = SEMANTIC_COLOR_MAP.info;
const neutral = SEMANTIC_COLOR_MAP.neutral;

export default function PaymentOrderSignatureLine({ orderId, authToken, onSigned }: PaymentOrderSignatureLineProps) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<PaymentOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setDetail(await fetchPaymentOrder(orderId, authToken));
    } catch (error) {
      logError("PaymentOrderSignatureLine.load", error);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        <Spinner size="sm" /> Cargando firmas...
      </div>
    );
  }

  if (!detail || detail.signatureLine.length === 0) {
    return null;
  }

  const handleSign = async () => {
    setIsSigning(true);
    try {
      await signPaymentOrder(orderId, authToken);
      showToast("Orden firmada correctamente.", "success");
      setConfirming(false);
      await load();
      onSigned?.();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo registrar la firma."), "error");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
          <FileSignature className="h-3.5 w-3.5 text-brand-600" /> Firmas
        </h3>
        {!detail.integrityValid && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-danger-600">
            <ShieldAlert className="h-3 w-3" /> Integridad comprometida
          </span>
        )}
      </div>

      <ol className="space-y-2">
        {detail.signatureLine.map(({ step, status, signedByName, signedAt }) => {
          const isSigned = status === "FIRMADO";
          const isNext = status === "PROXIMO";
          const c = isSigned ? success : isNext ? info : neutral;
          return (
            <li key={step.id} className={`flex items-center gap-3 rounded-control border px-3 py-2 ${c.border100} ${isSigned || isNext ? c.bg50 : "bg-white"}`}>
              <span aria-hidden="true">
                {isSigned ? <Check className={`h-4 w-4 ${c.text600}`} /> : <CircleDashed className={`h-4 w-4 ${isNext ? c.text600 : "text-text-muted"}`} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary">{step.label}</p>
                <p className="text-[11px] text-text-tertiary">
                  {isSigned
                    ? `Firmado por ${signedByName ?? "—"}${signedAt ? ` · ${new Date(signedAt).toLocaleString("es-VE")}` : ""}`
                    : step.userName ?? step.role ?? "—"}
                </p>
              </div>
              {isNext && detail.canSign && (
                <Button size="sm" variant="primary" colorScheme="indigo" onClick={() => setConfirming(true)}>
                  Firmar
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void handleSign()}
        title="Firmar orden de pago"
        message="¿Confirma su firma para este paso? Queda registrada con su usuario, rol, fecha y hora."
        variant="info"
        confirmLabel="Firmar"
        isLoading={isSigning}
      />
    </div>
  );
}
