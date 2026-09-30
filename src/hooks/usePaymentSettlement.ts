/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado y cálculo del formulario "¿cómo se pagó?" de Finanzas (anticipo y
 * finiquito): modo (moneda cotizada / bolívares / otra moneda), moneda, monto
 * pagado, tasa aplicada y su origen, motivo de la diferencia, banco y
 * referencia. Deriva la tasa sugerida, el equivalente cubierto en la moneda de
 * la obligación y la diferencia; expone `payload` listo para el backend y
 * `isValid` para habilitar la confirmación. La lógica autoritativa vive en el
 * backend (PaymentSettlementService): esto es la vista previa.
 *
 * Al cambiar modo, moneda u origen de la tasa, precarga la tasa sugerida y el
 * monto que resulta de ella; Finanzas edita después la tasa y el monto reales.
 */

import { useCallback, useMemo, useState } from "react";
import type { AppliedRateSource, PaymentMode } from "@/types";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import {
  BS_CURRENCY,
  coveredAmount,
  differenceAmount,
  exceedsTolerance,
  round2,
  suggestedRate,
} from "@/utils/paymentSettlement";

export interface PaymentObligation {
  /** Monto en la moneda de la obligación (la de cotización). */
  amount: number;
  currency: string;
}

export interface SettlementFormState {
  mode: PaymentMode | null;
  paidCurrency: string;
  paidAmount: number | "";
  appliedRate: number | "";
  rateSource: AppliedRateSource;
  differenceReason: string;
  bank: string;
  reference: string;
}

/** Campos que viajan al backend junto a `paymentType` y `amount` (ver PayProjectRequest). */
export interface SettlementPayload {
  paymentMode: PaymentMode;
  paidAmount: number;
  paidCurrency?: string;
  appliedRate?: number;
  appliedRateSource?: AppliedRateSource;
  differenceReason?: string;
  bank?: string;
  reference?: string;
}

const EMPTY: SettlementFormState = {
  mode: null,
  paidCurrency: "",
  paidAmount: "",
  appliedRate: "",
  rateSource: "BCV",
  differenceReason: "",
  bank: "",
  reference: "",
};

export function usePaymentSettlement(obligation: PaymentObligation | null) {
  const { rates } = useCurrencyConversion();
  const [state, setState] = useState<SettlementFormState>(EMPTY);

  const currency = obligation?.currency ?? "";
  const amount = obligation?.amount ?? 0;

  /** Recalcula tasa y monto sugeridos para una combinación modo/moneda/origen. */
  const withSuggestion = useCallback(
    (next: SettlementFormState): SettlementFormState => {
      if (!next.mode || next.mode === "QUOTE_CURRENCY") {
        return { ...next, paidCurrency: currency, appliedRate: 1, paidAmount: amount };
      }
      const paidCurrency = next.mode === "BS" ? BS_CURRENCY : next.paidCurrency;
      const rate = suggestedRate(rates, currency, paidCurrency, next.rateSource);
      return {
        ...next,
        paidCurrency,
        appliedRate: rate ?? "",
        paidAmount: rate ? round2(amount * rate) : "",
      };
    },
    [amount, currency, rates],
  );

  const reset = useCallback(() => setState(EMPTY), []);

  const setMode = useCallback(
    (mode: PaymentMode) => setState(prev => withSuggestion({ ...prev, mode, paidCurrency: mode === "OTHER_CURRENCY" ? "" : prev.paidCurrency })),
    [withSuggestion],
  );
  const setPaidCurrency = useCallback((paidCurrency: string) => setState(prev => withSuggestion({ ...prev, paidCurrency })), [withSuggestion]);
  const setRateSource = useCallback((rateSource: AppliedRateSource) => setState(prev => withSuggestion({ ...prev, rateSource })), [withSuggestion]);
  const setField = useCallback(
    <K extends keyof SettlementFormState>(key: K, value: SettlementFormState[K]) => setState(prev => ({ ...prev, [key]: value })),
    [],
  );

  const derived = useMemo(() => {
    const mode = state.mode;
    const paidCurrency = mode === "QUOTE_CURRENCY" ? currency : mode === "BS" ? BS_CURRENCY : state.paidCurrency;
    const rate = mode === "QUOTE_CURRENCY" ? 1 : state.appliedRate === "" ? 0 : state.appliedRate;
    const paid = state.paidAmount === "" ? 0 : state.paidAmount;
    const suggested = mode ? suggestedRate(rates, currency, paidCurrency, mode === "QUOTE_CURRENCY" ? null : state.rateSource) : null;
    const covered = rate > 0 ? coveredAmount(paid, rate) : 0;
    const difference = differenceAmount(covered, amount);
    const needsReason = !!mode && paid > 0 && exceedsTolerance(difference);
    const reasonOk = !needsReason || state.differenceReason.trim().length >= 5;
    const conversionOk = mode === "QUOTE_CURRENCY" || (rate > 0 && (mode !== "OTHER_CURRENCY" || !!state.paidCurrency));
    const isValid = !!obligation && !!mode && paid > 0 && conversionOk && reasonOk;

    return { paidCurrency, rate, suggested, covered, difference, needsReason, isValid };
  }, [state, currency, amount, rates, obligation]);

  const payload = useMemo<SettlementPayload | null>(() => {
    if (!state.mode || !derived.isValid) return null;
    const base: SettlementPayload = { paymentMode: state.mode, paidAmount: Number(state.paidAmount) };
    if (state.mode !== "QUOTE_CURRENCY") {
      base.appliedRate = Number(state.appliedRate);
      base.appliedRateSource = state.rateSource;
      if (state.mode === "OTHER_CURRENCY") base.paidCurrency = state.paidCurrency;
    }
    if (derived.needsReason) base.differenceReason = state.differenceReason.trim();
    if (state.bank.trim()) base.bank = state.bank.trim();
    if (state.reference.trim()) base.reference = state.reference.trim();
    return base;
  }, [state, derived]);

  return { state, mode: state.mode, setMode, setPaidCurrency, setRateSource, setField, reset, ...derived, payload };
}
