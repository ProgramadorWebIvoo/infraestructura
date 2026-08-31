/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook agnóstico de conversión de monedas a Bs. (Bolívares).
 * Obtiene tasas en tiempo real y expone métodos para convertir cualquier
 * moneda a Bs. Preparado para escalar: si mañana hay EUR, GBP, etc.
 */

import { useCallback, useMemo } from "react";
import { useExchangeRates } from "./useExchangeRates";
import { useAuth } from "./useAuth";

export interface UseCurrencyConversionReturn {
  /** Tasas por moneda: "USD" → 794.99, "EUR" → 862.15, etc. */
  rates: Record<string, number>;
  /** Convierte amount de cualquier moneda a Bs. */
  convert: (amount: number, fromCode: string) => number;
  /** Obtiene la tasa de una moneda específica, null si no existe */
  getRate: (code: string) => number | null;
  /** Si está cargando tasas */
  isLoading: boolean;
  /** Si hay tasas disponibles */
  hasRates: boolean;
}

export function useCurrencyConversion(): UseCurrencyConversionReturn {
  const { authToken } = useAuth();
  const { rates: exchangeRates, isLoading } = useExchangeRates(authToken || "", !!authToken);

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
    getRate,
    isLoading,
    hasRates: Object.keys(rates).length > 0,
  };
}
