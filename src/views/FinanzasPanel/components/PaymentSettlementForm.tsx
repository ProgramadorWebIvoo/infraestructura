/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulario "¿cómo se pagó?" del modal de pago de Finanzas. La orden expresa
 * la obligación en la moneda de cotización; aquí Finanzas declara lo que
 * realmente pagó — en esa moneda, en bolívares o en otra moneda — con el monto
 * y la tasa reales. Muestra el equivalente cubierto y la diferencia contra la
 * orden (con motivo obligatorio si la hay) y, como referencia, la tasa
 * congelada de la cotización cuando la configuración la aplicó.
 * El estado y los cálculos viven en `usePaymentSettlement`.
 */

import { Landmark, Scale } from "lucide-react";
import FrozenRateBadge from "@/components/UI/FrozenRateBadge";
import NumericInput from "@/components/UI/NumericInput";
import Select from "@/components/UI/Select";
import SegmentedControl, { type SegmentedOption } from "@/components/UI/SegmentedControl";
import TextField from "@/components/UI/TextField";
import { RequiredMark } from "@/components/UI/HintSignals";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useQuoteCurrencyOptions } from "@/hooks/useQuoteCurrencyOptions";
import type { PaymentObligation, usePaymentSettlement } from "@/hooks/usePaymentSettlement";
import type { AppliedRateSource, PaymentMode, RateFreeze } from "@/types";
import {
  BS_CURRENCY,
  PAYMENT_MODE_LABELS,
  RATE_SOURCE_LABELS,
  formatPaidAmount,
  formatRate,
} from "@/utils/paymentSettlement";

const LABEL_CLASS = "mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500";

const RATE_SOURCE_OPTIONS = (Object.keys(RATE_SOURCE_LABELS) as AppliedRateSource[]).map(value => ({ value, label: RATE_SOURCE_LABELS[value] }));

interface PaymentSettlementFormProps {
  settlement: ReturnType<typeof usePaymentSettlement>;
  obligation: PaymentObligation;
  /** Tasa congelada al adjudicar (la de la cotización), si la configuración la aplicó. */
  contractFreeze?: RateFreeze;
}

export default function PaymentSettlementForm({ settlement, obligation, contractFreeze }: PaymentSettlementFormProps) {
  const currencyOptions = useQuoteCurrencyOptions();
  const { state, mode, paidCurrency, suggested, covered, difference, needsReason } = settlement;

  const modeOptions: SegmentedOption<PaymentMode>[] = (Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map(value => ({
    value,
    label: PAYMENT_MODE_LABELS[value],
    description: value === "QUOTE_CURRENCY" ? obligation.currency : undefined,
  }));

  // Otra moneda: cualquiera activa salvo la de la obligación (los bolívares tienen su propio modo).
  const otherCurrencyOptions = currencyOptions.filter(option => option.value !== obligation.currency);
  const isConversion = mode === "BS" || mode === "OTHER_CURRENCY";
  const differenceColor = !mode ? null : needsReason ? SEMANTIC_COLOR_MAP.warning : SEMANTIC_COLOR_MAP.success;

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

      {mode && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mode === "OTHER_CURRENCY" && (
            <div>
              <label className={LABEL_CLASS}>
                Moneda pagada <RequiredMark filled={!!state.paidCurrency} />
              </label>
              <Select
                value={state.paidCurrency}
                onChange={settlement.setPaidCurrency}
                options={[{ value: "", label: "Selecciona…" }, ...otherCurrencyOptions]}
                size="md"
              />
            </div>
          )}

          {isConversion && (
            <>
              <div>
                <label className={LABEL_CLASS}>Origen de la tasa</label>
                <Select value={state.rateSource} onChange={value => settlement.setRateSource(value as AppliedRateSource)} options={RATE_SOURCE_OPTIONS} size="md" />
              </div>
              <div>
                <label className={LABEL_CLASS}>
                  Tasa aplicada (1 {obligation.currency} = ? {paidCurrency === BS_CURRENCY ? "Bs." : paidCurrency || "…"}) <RequiredMark filled={state.appliedRate !== "" && state.appliedRate > 0} />
                </label>
                <NumericInput
                  value={state.appliedRate}
                  onChange={value => settlement.setField("appliedRate", value)}
                  step="0.0001"
                  placeholder="0.0000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-mono"
                />
                {suggested != null && (
                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                    Sugerida por el sistema: <span className="font-mono font-bold">{formatRate(suggested)}</span>
                    {state.appliedRate !== suggested && (
                      <button type="button" onClick={() => settlement.setField("appliedRate", suggested)} className="ml-1.5 cursor-pointer font-bold text-sky-600 hover:underline">
                        Usar
                      </button>
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          <div className={isConversion ? "sm:col-span-2" : ""}>
            <label className={LABEL_CLASS}>
              Monto pagado {paidCurrency ? `(${paidCurrency === BS_CURRENCY ? "Bs." : paidCurrency})` : ""} <RequiredMark filled={state.paidAmount !== "" && state.paidAmount > 0} />
            </label>
            <NumericInput
              value={state.paidAmount}
              onChange={value => settlement.setField("paidAmount", value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-mono"
            />
          </div>
        </div>
      )}

      {mode && differenceColor && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3.5 py-2.5 text-[11px] font-semibold"
          style={{ backgroundColor: differenceColor.bg50, borderColor: differenceColor.border200, color: differenceColor.text700 }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            Cubre {formatPaidAmount(covered, obligation.currency)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            Diferencia: {difference > 0 ? "+" : ""}
            {formatPaidAmount(difference, obligation.currency)}
          </span>
        </div>
      )}

      {needsReason && (
        <TextField
          id="payment-difference-reason"
          label="Motivo de la diferencia"
          as="textarea"
          rows={2}
          maxLength={500}
          required
          value={state.differenceReason}
          onChange={value => settlement.setField("differenceReason", value)}
          placeholder="Ej. Comisión bancaria descontada, diferencia cambiaria del día…"
        />
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
