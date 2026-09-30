/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cómo se pagó realmente una orden (Finanzas): moneda y monto pagados, tasa
 * aplicada vs sugerida, equivalente cubierto y diferencia contra la
 * obligación (con su motivo) y las tasas congeladas de la cotización y del
 * pago. Fuente única para la orden pagada ("full") y el histórico de obra
 * ("compact"), así ambos muestran exactamente lo mismo.
 *
 * Un pago anterior al registro de liquidación (`paymentMode` null) no tiene
 * detalle: se indica en vez de inventar datos.
 */

import FrozenRateBadge from "@/components/UI/FrozenRateBadge";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import type { PaymentSettlement } from "@/types";
import {
  BS_CURRENCY,
  PAYMENT_MODE_LABELS,
  RATE_SOURCE_LABELS,
  exceedsTolerance,
  formatPaidAmount,
  formatRate,
} from "@/utils/paymentSettlement";

interface PaymentSettlementSummaryProps {
  settlement: PaymentSettlement;
  variant?: "full" | "compact";
  className?: string;
}

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-text-tertiary";

export default function PaymentSettlementSummary({ settlement: s, variant = "full", className = "" }: PaymentSettlementSummaryProps) {
  if (s.paymentMode === null || s.paidCurrency === null || s.paidAmount === null || s.obligationCurrency === null) {
    return <p className={`text-[11px] italic text-text-tertiary ${className}`}>Sin detalle de moneda (pago anterior al registro de liquidación).</p>;
  }

  const isConversion = s.paidCurrency !== s.obligationCurrency;
  const difference = s.differenceAmount ?? 0;
  const hasDifference = exceedsTolerance(difference);
  const differenceColor = hasDifference ? SEMANTIC_COLOR_MAP.warning : SEMANTIC_COLOR_MAP.success;
  const rateUnit = s.paidCurrency === BS_CURRENCY ? "Bs." : s.paidCurrency;
  const isCompact = variant === "compact";

  return (
    <div className={`space-y-1.5 text-xs ${className}`}>
      <p className="font-mono font-black text-text-primary">
        {formatPaidAmount(s.paidAmount, s.paidCurrency)}
        <span className="ml-1.5 font-sans text-[10px] font-semibold text-text-tertiary">{PAYMENT_MODE_LABELS[s.paymentMode]}</span>
      </p>

      {isConversion && s.appliedRate !== null && (
        <p className="text-text-secondary">
          Tasa aplicada: <span className="font-mono font-bold">1 {s.obligationCurrency} = {formatRate(s.appliedRate)} {rateUnit}</span>
          {s.appliedRateSource && <span className="text-text-tertiary"> ({RATE_SOURCE_LABELS[s.appliedRateSource]})</span>}
          {s.suggestedRate !== null && s.suggestedRate !== s.appliedRate && (
            <span className="text-text-tertiary"> · sugerida {formatRate(s.suggestedRate)}</span>
          )}
        </p>
      )}

      <p className="text-text-secondary">
        Obligación {s.obligationAmount !== null ? formatPaidAmount(s.obligationAmount, s.obligationCurrency) : "—"}
        {s.coveredAmount !== null && <> · cubierto {formatPaidAmount(s.coveredAmount, s.obligationCurrency)}</>}
        {s.differenceAmount !== null && (
          <span className="font-semibold" style={{ color: differenceColor.text700 }}>
            {" "}· diferencia {difference > 0 ? "+" : ""}
            {formatPaidAmount(difference, s.obligationCurrency)}
          </span>
        )}
      </p>
      {s.differenceReason && <p className="text-text-tertiary">Motivo de la diferencia: {s.differenceReason}</p>}

      {(s.contractRateFreeze || s.paymentRateFreeze) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {s.contractRateFreeze && (
            <span className="inline-flex items-center gap-1.5">
              <span className={LABEL}>Cotización</span>
              <FrozenRateBadge freeze={s.contractRateFreeze} />
            </span>
          )}
          {s.paymentRateFreeze && (
            <span className="inline-flex items-center gap-1.5">
              <span className={LABEL}>Pago</span>
              <FrozenRateBadge freeze={s.paymentRateFreeze} />
            </span>
          )}
        </div>
      )}

      {!isCompact && (s.bank || s.reference || s.paidDate) && (
        <p className="text-text-tertiary">
          {[s.paidDate && `Fecha ${s.paidDate}`, s.bank && `Banco ${s.bank}`, s.reference && `Ref. ${s.reference}`].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
