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
import { useExchangeRatesContext } from "@/components/UI/ExchangeRatesProvider";
import { logWarn } from "@/services/logger";
import { useUsdRateModeStore, type UsdRateMode } from "@/stores/usdRateModeStore";
import { useRateSwitchRoleAllowed } from "./useRateSwitchRoleAllowed";

const USDT_CODE = "USDT";

/** Formatea un monto en Bs.: separador de miles ".", decimales ",", siempre 2 decimales, truncado (no redondeado). */
export function formatBs(value: number): string {
  return truncateToDecimals(value, 2).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface UseCurrencyConversionReturn {
  /** Tasas BCV por moneda (bolívares por unidad): "USD" → 794.99, "EUR" → 862.15, etc. */
  rates: Record<string, number>;
  /**
   * Convierte amount de cualquier moneda a Bs. Para "USD" usa la tasa del
   * modo activo (BCV o USDT); el resto de monedas siempre usa su tasa BCV.
   */
  convert: (amount: number, fromCode: string) => number;
  /**
   * Modo efectivo de la tasa USD→Bs.: el elegido por el usuario, o "BCV" si
   * eligió USDT pero no hay tasa USDT disponible (evita mostrar 0) o su rol
   * ya no tiene el switch habilitado.
   */
  usdRateMode: UsdRateMode;
  /** Cambia el modo (persistente entre sesiones). */
  setUsdRateMode: (mode: UsdRateMode) => void;
  /** Si hay tasa USDT disponible (condición necesaria para el switch BCV/USDT). */
  hasUsdtRate: boolean;
  /** Nombre del dólar activo: "USD-BCV" o "USD-USDT" (el que elige el switch). */
  usdLabel: "USD-BCV" | "USD-USDT";
  /**
   * Expresa en el DÓLAR ACTIVO el valor de una oferta: `amountBase` está en USD-BCV (así lo guarda
   * el backend). En modo BCV se devuelve tal cual (es el valor fijado al cotizar); en modo USDT, si la
   * oferta vino en otra moneda (`original` + `currency`), se re-expresa con la tasa USDT vigente
   * (1.200 USDT = 1.200 USD-USDT, no 1.500 USD-BCV). Un monto nativo en USD no cambia.
   */
  convertToModeUsd: (amountBase: number, original?: number | null, currency?: string | null) => number;
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

  // Construir mapa de tasas por moneda (ej: "USD" → 794.99), tomando la más
  // reciente de cada una — el backend (/exchange-rates) ya devuelve una sola
  // fila por moneda, pero esto queda a prueba de que algún consumidor futuro
  // pase el histórico completo.
  const rates = useMemo(() => {
    const latestEffectiveAt: Record<string, string> = {};
    const ratesByCode: Record<string, number> = {};

    for (const rate of exchangeRates) {
      const current = latestEffectiveAt[rate.currency_code];
      if (!current || new Date(rate.effective_at) > new Date(current)) {
        latestEffectiveAt[rate.currency_code] = rate.effective_at;
        ratesByCode[rate.currency_code] = rate.rate_to_usd;
      }
    }

    return ratesByCode;
  }, [exchangeRates]);

  const storedMode = useUsdRateModeStore(s => s.mode);
  const setUsdRateMode = useUsdRateModeStore(s => s.setMode);
  const hasUsdtRate = !!rates[USDT_CODE];
  // Si al rol le quitan el switch en CONFIG APP, vuelve a BCV aunque tenga
  // USDT guardado — no debe quedar "atrapado" en un modo que no puede cambiar.
  const roleAllowed = useRateSwitchRoleAllowed();
  const usdRateMode: UsdRateMode = storedMode === "USDT" && hasUsdtRate && roleAllowed ? "USDT" : "BCV";

  // Convertir cualquier moneda a Bs. Solo "USD" obedece al modo: convertBetween
  // y el resto de monedas quedan en BCV para que las comparaciones entre
  // monedas cotizadas no cambien con el switch.
  const convert = useCallback(
    (amount: number, fromCode: string): number => {
      const rate = fromCode === "USD" && usdRateMode === "USDT" ? rates[USDT_CODE] : rates[fromCode];
      if (!rate) {
        logWarn("useCurrencyConversion", `No hay tasa para ${fromCode}, devolviendo 0`);
        return 0;
      }
      return amount * rate;
    },
    [rates, usdRateMode],
  );

  const usdLabel: "USD-BCV" | "USD-USDT" = usdRateMode === "USDT" ? "USD-USDT" : "USD-BCV";

  const convertToModeUsd = useCallback(
    (amountBase: number, original?: number | null, currency?: string | null): number => {
      if (usdRateMode !== "USDT" || original == null || !currency || currency === "USD") return amountBase;
      const fromRate = rates[currency];
      const usdtRate = rates[USDT_CODE];
      // Sin tasa para re-expresar, se conserva el valor en USD-BCV antes que mostrar un 0 engañoso.
      return fromRate && usdtRate ? (original * fromRate) / usdtRate : amountBase;
    },
    [rates, usdRateMode],
  );

  // Convertir entre dos monedas cualquiera (pivote: bolívar)
  const convertBetween = useCallback(
    (amount: number, fromCode: string, toCode: string): number => {
      if (fromCode === toCode) return amount;
      const fromRate = rates[fromCode];
      const toRate = rates[toCode];
      if (!fromRate || !toRate) {
        logWarn("useCurrencyConversion", `falta tasa para ${fromCode} o ${toCode}, devolviendo 0`);
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
    usdRateMode,
    setUsdRateMode,
    hasUsdtRate,
    usdLabel,
    convertToModeUsd,
    convertBetween,
    getRate,
    isLoading,
    hasRates: Object.keys(rates).length > 0,
  };
}
