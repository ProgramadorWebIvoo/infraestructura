/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook agnóstico de conversión de monedas a Bs. (Bolívares).
 * Obtiene tasas en tiempo real y expone métodos para convertir cualquier
 * moneda a Bs. Preparado para escalar: si mañana hay EUR, GBP, etc.
 */

import { useCallback, useMemo } from "react";
import { truncateToDecimals } from "@ivoo/shared";
import { useExchangeRatesContext } from "../components/UI/ExchangeRatesProvider";

/** Formatea un monto en Bs.: separador de miles ".", decimales ",", siempre 2 decimales, truncado (no redondeado). */
export function formatBs(value: number): string {
  return truncateToDecimals(value, 2).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface UseCurrencyConversionReturn {
  /** Tasas BCV por moneda (bolívares por unidad): "USD" → 794.99, "EUR" → 862.15, etc. */
  rates: Record<string, number>;
  /** Convierte amount de cualquier moneda a Bs. */
  convert: (amount: number, fromCode: string) => number;
  /**
   * Convierte entre dos monedas cualquiera usando el bolívar como pivote —
   * equivalente en frontend de `ExchangeRate::rateBetween()` del backend.
   * Necesario para comparar/sumar montos cotizados en monedas distintas
   * (ej. sumar una oferta en EUR con otra en USD): multiplicar por la tasa
   * BCV de una sola moneda da bolívares, no la otra moneda.
   */
  convertBetween: (amount: number, fromCode: string, toCode: string) => number;
  /** Obtiene la tasa de una moneda específica, null si no existe */
  getRate: (code: string) => number | null;
  /** Si está cargando tasas */
  isLoading: boolean;
  /** Si hay tasas disponibles */
  hasRates: boolean;
}

export function useCurrencyConversion(): UseCurrencyConversionReturn {
  // Lee del contexto compartido (un solo fetch por sesión, ver
  // ExchangeRatesProvider) en vez de montar su propio useAuth+useExchangeRates
  // por cada componente que muestre un monto. Fuera del provider degrada a
  // "sin tasas" sin romper el render.
  const context = useExchangeRatesContext();
  const exchangeRates = context?.rates ?? [];
  const isLoading = context?.isLoading ?? false;

  // Construir mapa de tasas por moneda (ej: "USD" → 794.99)
  const rates = useMemo(() => {
    const ratesByCode: Record<string, number> = {};

    for (const rate of exchangeRates) {
      // Tomar la tasa más reciente de cada moneda
      if (!ratesByCode[rate.currency_code] || new Date(rate.effective_at) > new Date(exchangeRates.find(r => r.currency_code === rate.currency_code)?.effective_at || "")) {
        ratesByCode[rate.currency_code] = rate.rate_to_usd;
      }
    }

    return ratesByCode;
  }, [exchangeRates]);

  // Convertir cualquier moneda a Bs.
  const convert = useCallback(
    (amount: number, fromCode: string): number => {
      const rate = rates[fromCode];
      if (!rate) {
        console.warn(`useCurrencyConversion: No hay tasa para ${fromCode}, devolviendo 0`);
        return 0;
      }
      return amount * rate;
    },
    [rates],
  );

  // Convertir entre dos monedas cualquiera (pivote: bolívar)
  const convertBetween = useCallback(
    (amount: number, fromCode: string, toCode: string): number => {
      if (fromCode === toCode) return amount;
      const fromRate = rates[fromCode];
      const toRate = rates[toCode];
      if (!fromRate || !toRate) {
        console.warn(`useCurrencyConversion: falta tasa para ${fromCode} o ${toCode}, devolviendo 0`);
        return 0;
      }
      return (amount * fromRate) / toRate;
    },
    [rates],
  );

  // Obtener tasa de una moneda específica
  const getRate = useCallback(
    (code: string): number | null => {
      return rates[code] ?? null;
    },
    [rates],
  );

  return {
    rates,
    convert,
    convertBetween,
    getRate,
    isLoading,
    hasRates: Object.keys(rates).length > 0,
  };
}
