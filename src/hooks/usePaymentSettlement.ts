/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado y cálculo del formulario "¿cómo se pagó?" de Finanzas (anticipo y
 * finiquito). Finanzas solo ELIGE cómo se pagó — en la moneda cotizada, en
 * bolívares o en otra moneda (y cuál); la tasa y el monto pagado NO se digitan:
 * se derivan de la obligación y de la tasa del sistema para esa moneda, y el
 * formulario los muestra de solo lectura. Por eso no hay diferencia contra la
 * orden que justificar. `payload` queda listo para el backend, que valida y
 * recalcula (PaymentSettlementService).
 *
 * Origen de la tasa: el de la propia moneda — USDT usa su tasa, el resto la
 * BCV; una obligación en USD pagada en bolívares sigue al switch BCV/USDT.
 */

import { useCallback, useMemo, useState } from "react";
import type { AppliedRateSource, PaymentMode } from "@/types";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { BS_CURRENCY, round2, roundTo, suggestedRate } from "@/utils/paymentSettlement";

export interface PaymentObligation {
  /** Monto en la moneda de la obligación (la de cotización). */
  amount: number;
  currency: string;
}

export interface SettlementFormState {
  mode: PaymentMode | null;
  /** Solo en "otra moneda": la moneda elegida. */
  paidCurrency: string;
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
  bank?: string;
  reference?: string;
}

const EMPTY: SettlementFormState = { mode: null, paidCurrency: "", bank: "", reference: "" };

export function usePaymentSettlement(obligation: PaymentObligation | null) {
  const { rates, usdRateMode } = useCurrencyConversion();
  const [state, setState] = useState<SettlementFormState>(EMPTY);

  const currency = obligation?.currency ?? "";
  const amount = obligation?.amount ?? 0;

  const reset = useCallback(() => setState(EMPTY), []);
  const setMode = useCallback((mode: PaymentMode) => setState(prev => ({ ...prev, mode, paidCurrency: mode === "OTHER_CURRENCY" ? prev.paidCurrency : "" })), []);
  const setPaidCurrency = useCallback((paidCurrency: string) => setState(prev => ({ ...prev, paidCurrency })), []);
  const setField = useCallback(
    <K extends "bank" | "reference">(key: K, value: SettlementFormState[K]) => setState(prev => ({ ...prev, [key]: value })),
    [],
  );

  const derived = useMemo(() => {
    const mode = state.mode;
    const paidCurrency = mode === "QUOTE_CURRENCY" ? currency : mode === "BS" ? BS_CURRENCY : mode === "OTHER_CURRENCY" ? state.paidCurrency : "";

    // Origen de la tasa: el de la propia moneda; una obligación en USD pagada en Bs. sigue al switch.
    const rateSource: AppliedRateSource =
      currency === "USDT" || paidCurrency === "USDT" || (currency === "USD" && paidCurrency === BS_CURRENCY && usdRateMode === "USDT") ? "USDT" : "BCV";

    const isConversion = mode === "BS" || mode === "OTHER_CURRENCY";
    const appliedRate = mode === "QUOTE_CURRENCY" ? 1 : isConversion && paidCurrency ? suggestedRate(rates, currency, paidCurrency, rateSource) : null;
    const paidAmount = mode === "QUOTE_CURRENCY" ? amount : appliedRate ? round2(amount * appliedRate) : null;
    const isValid = !!obligation && !!mode && paidAmount !== null && paidAmount > 0 && (mode !== "OTHER_CURRENCY" || !!state.paidCurrency);

    return { paidCurrency, rateSource, isConversion, appliedRate, paidAmount, isValid };
  }, [state, currency, amount, rates, usdRateMode, obligation]);

  const payload = useMemo<SettlementPayload | null>(() => {
    if (!state.mode || !derived.isValid || derived.paidAmount === null) return null;
    const base: SettlementPayload = { paymentMode: state.mode, paidAmount: round2(derived.paidAmount) };
    if (state.mode !== "QUOTE_CURRENCY" && derived.appliedRate !== null) {
      base.appliedRate = roundTo(derived.appliedRate, 8);
      base.appliedRateSource = derived.rateSource;
      if (state.mode === "OTHER_CURRENCY") base.paidCurrency = state.paidCurrency;
    }
    if (state.bank.trim()) base.bank = state.bank.trim();
    if (state.reference.trim()) base.reference = state.reference.trim();
    return base;
  }, [state, derived]);

  return { state, mode: state.mode, setMode, setPaidCurrency, setField, reset, ...derived, payload };
}
