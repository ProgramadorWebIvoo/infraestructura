/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cálculo puro de la liquidación de un pago — el MISMO que hace el backend
 * (PaymentSettlementService), para mostrar la vista previa mientras Finanzas
 * llena el formulario. El backend recalcula y valida: esto es solo UX.
 *
 * Tasa = unidades de la moneda pagada por 1 unidad de la moneda de la
 * obligación (ej. 1 USDT = 960 Bs.).
 */

import { formatCurrency, truncateToDecimals } from "@ivoo/shared";
import type { AppliedRateSource, PaymentMode } from "@ivoo/shared";

/** Código con el que se registra el bolívar (no es una moneda cotizable del catálogo). */
export const BS_CURRENCY = "VES";

/** Diferencia máxima (en la moneda de la obligación) que se acepta sin motivo. */
export const DIFFERENCE_TOLERANCE = 0.01;

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  QUOTE_CURRENCY: "En la moneda cotizada",
  BS: "En bolívares (Bs.)",
  OTHER_CURRENCY: "En otra moneda",
};

export const RATE_SOURCE_LABELS: Record<AppliedRateSource, string> = {
  BCV: "Tasa BCV",
  USDT: "Tasa USDT",
  MANUAL: "Otra / manual",
};

/**
 * Monto en la moneda en que se pagó: bolívares como "Bs. 1.234,56" (formato es-VE,
 * truncado como el resto de montos en Bs.), el resto con `formatCurrency` (soporta USDT).
 */
export function formatPaidAmount(amount: number, currency: string): string {
  if (currency === BS_CURRENCY) {
    return `Bs. ${truncateToDecimals(amount, 2).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${formatCurrency(amount, currency)} ${currency}`;
}

/** Tasa con hasta 8 decimales, sin ceros de relleno ("960" o "0,8"). */
export function formatRate(rate: number): string {
  return rate.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 8 });
}

/** Redondeo a 2 decimales (mismo criterio que `round(x, 2)` del backend). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Tasa que el sistema sugeriría, o null si faltan tasas. `rates` es el mapa
 * moneda → Bs. por unidad (BCV para USD/EUR, la propia para USDT). En bolívares
 * usa la tasa de la moneda de la obligación (con origen USDT y obligación en USD,
 * la del USDT); entre dos monedas, el cruce por el bolívar.
 */
export function suggestedRate(
  rates: Record<string, number>,
  obligationCurrency: string,
  paidCurrency: string,
  source: AppliedRateSource | null,
): number | null {
  if (!paidCurrency) return null;
  if (paidCurrency === obligationCurrency) return 1;

  if (paidCurrency === BS_CURRENCY) {
    const basis = source === "USDT" && obligationCurrency === "USD" ? "USDT" : obligationCurrency;
    return rates[basis] ?? null;
  }

  const from = rates[obligationCurrency];
  const to = rates[paidCurrency];
  return from && to ? from / to : null;
}

/** Equivalente pagado en la moneda de la obligación (paid / rate). */
export function coveredAmount(paidAmount: number, appliedRate: number): number {
  return appliedRate > 0 ? round2(paidAmount / appliedRate) : 0;
}

/** Diferencia contra la obligación: positiva = se pagó de más. */
export function differenceAmount(covered: number, obligationAmount: number): number {
  return round2(covered - obligationAmount);
}

export function exceedsTolerance(difference: number): boolean {
  return Math.abs(difference) > DIFFERENCE_TOLERANCE;
}
