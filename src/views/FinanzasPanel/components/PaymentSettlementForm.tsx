/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulario "¿cómo se pagó?" del modal de pago de Finanzas. La orden expresa
 * la obligación en la moneda de cotización; aquí Finanzas solo elige cómo se
 * pagó — en esa moneda, en bolívares o en otra moneda (y cuál). La tasa
 * aplicada y el monto pagado se derivan de la tasa del sistema y se muestran de
 * solo lectura: no se digitan, así que no hay diferencia que justificar. En la
 * moneda cotizada no hay nada que completar. Se muestra, como referencia, la
 * tasa congelada de la cotización cuando la configuración la aplicó.
 * El estado y los cálculos viven en `usePaymentSettlement`.
 */

import FrozenRateBadge from "@/components/UI/FrozenRateBadge";
import Select from "@/components/UI/Select";
import SegmentedControl, { type SegmentedOption } from "@/components/UI/SegmentedControl";
import TextField from "@/components/UI/TextField";
import { RequiredMark } from "@/components/UI/HintSignals";
import { useQuoteCurrencyOptions } from "@/hooks/useQuoteCurrencyOptions";
import type { PaymentObligation, usePaymentSettlement } from "@/hooks/usePaymentSettlement";
import type { PaymentMode, RateFreeze } from "@/types";
import { BS_CURRENCY, PAYMENT_MODE_LABELS, RATE_SOURCE_LABELS, formatPaidAmount, formatRate } from "@/utils/paymentSettlement";

const LABEL_CLASS = "mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-text-tertiary";
const READONLY_CLASS = "w-full rounded-control border border-border-default bg-surface-sunken px-3.5 py-2.5 text-xs font-mono font-bold text-text-secondary";

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
      <input id={id} readOnly tabIndex={-1} value={value} className={READONLY_CLASS} aria-readonly="true" />
    </div>
  );
}

interface PaymentSettlementFormProps {
  settlement: ReturnType<typeof usePaymentSettlement>;
  obligation: PaymentObligation;
  /** Tasa congelada de la cotización, si la configuración la aplicó. */
  contractFreeze?: RateFreeze;
}

export default function PaymentSettlementForm({ settlement, obligation, contractFreeze }: PaymentSettlementFormProps) {
  const currencyOptions = useQuoteCurrencyOptions();
  const { state, mode, paidCurrency, appliedRate, paidAmount, rateSource, isConversion } = settlement;

  const modeOptions: SegmentedOption<PaymentMode>[] = (Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map(value => ({
    value,
    label: PAYMENT_MODE_LABELS[value],
    description: value === "QUOTE_CURRENCY" ? obligation.currency : undefined,
  }));

  // Otra moneda: cualquiera activa salvo la de la obligación (los bolívares tienen su propio modo).
  const otherCurrencyOptions = currencyOptions.filter(option => option.value !== obligation.currency);
  const rateUnit = paidCurrency === BS_CURRENCY ? "Bs." : paidCurrency;
  const missingRate = isConversion && !!paidCurrency && appliedRate === null;

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
        <p className={LABEL_CLASS}>Obligación de la orden de pago</p>
        <p className="font-mono text-sm font-black text-slate-800">{formatPaidAmount(obligation.amount, obligation.currency)}</p>
        {contractFreeze && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            Tasa congelada de la cotización:
            <FrozenRateBadge freeze={contractFreeze} />
          </div>
        )}
      </div>

      <div>
        <p className={LABEL_CLASS}>
          ¿En qué se pagó? <RequiredMark filled={!!mode} />
        </p>
        <SegmentedControl<PaymentMode>
          variant="card"
          options={modeOptions}
          value={(mode ?? "") as PaymentMode}
          onChange={settlement.setMode}
          ariaLabel="Moneda en que se realizó el pago"
        />
      </div>

      {mode === "OTHER_CURRENCY" && (
        <div>
          <label htmlFor="payment-paid-currency" className={LABEL_CLASS}>
            Moneda pagada <RequiredMark filled={!!state.paidCurrency} />
          </label>
          <Select
            id="payment-paid-currency"
            value={state.paidCurrency}
            onChange={settlement.setPaidCurrency}
            options={[{ value: "", label: "Selecciona…" }, ...otherCurrencyOptions]}
            size="md"
          />
        </div>
      )}

      {/* Solo conversión: tasa y monto de solo lectura, derivados de la tasa del sistema. */}
      {isConversion && !!paidCurrency && appliedRate !== null && paidAmount !== null && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField
            id="payment-applied-rate"
            label={`Tasa aplicada (1 ${obligation.currency} = ? ${rateUnit}) · ${RATE_SOURCE_LABELS[rateSource]}`}
            value={formatRate(appliedRate)}
          />
          <ReadOnlyField id="payment-paid-amount" label={`Monto a pagar (${rateUnit})`} value={formatPaidAmount(paidAmount, paidCurrency)} />
        </div>
      )}

      {missingRate && (
        <p className="text-[11px] font-semibold text-danger-700">No hay tasa disponible para convertir {obligation.currency} a {rateUnit}: no se puede registrar el pago en esa moneda.</p>
      )}

      {mode && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField id="payment-bank" label="Banco / plataforma (opcional)" value={state.bank} onChange={value => settlement.setField("bank", value)} maxLength={100} />
          <TextField id="payment-reference" label="Referencia (opcional)" value={state.reference} onChange={value => settlement.setField("reference", value)} maxLength={100} />
        </div>
      )}
    </div>
  );
}
