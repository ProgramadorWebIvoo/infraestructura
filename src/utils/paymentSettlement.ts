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

/**
 * Redondeo half-up a `decimals` decimales, equivalente a `round()` de PHP: se hace sobre la
 * representación decimal (1.005 → 1.01) y no sobre el float binario, que en medios exactos
 * daba un centavo distinto y podía discrepar del backend en el borde de la tolerancia.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  // Half-up "alejándose del cero" como PHP (Math.round de JS redondea los medios hacia +∞:
  // -1.005 daría -1.00 en vez de -1.01, y las diferencias negativas son frecuentes).
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const text = String(abs);
  // Notación exponencial (números muy pequeños o enormes): sin representación decimal fiable.
  if (text.includes("e")) return sign * (Math.round(abs * 10 ** decimals) / 10 ** decimals);
  const rounded = Math.round(Number(`${text}e${decimals}`));
  return sign * Number(`${rounded}e-${decimals}`);
}

/** Redondeo a 2 decimales (mismo criterio que `round(x, 2)` del backend). */
export function round2(value: number): number {
  return roundTo(value, 2);
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
