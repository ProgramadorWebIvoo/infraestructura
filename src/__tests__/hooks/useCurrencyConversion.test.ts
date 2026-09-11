import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";

describe("useCurrencyConversion", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({ rates: [], isLoading: false, hasLoaded: false });
  });

  it("toma la tasa más reciente cuando hay varias filas para la misma moneda, sin importar el orden", () => {
    // Regresión: la lógica previa comparaba siempre contra la PRIMERA
    // ocurrencia de la moneda en el array (exchangeRates.find(...)), nunca
    // contra la última tasa ya elegida — con filas fuera de orden, la
    // "más reciente" detectada podía ser la más vieja.
    useExchangeRatesStore.setState({
      rates: [
        { id: 1, currency_code: "USD", rate_to_usd: 700, source: "BCV_SCRAPING", effective_at: "2026-01-01", created_at: "", updated_at: "" },
        { id: 2, currency_code: "USD", rate_to_usd: 800, source: "DOLARVZLA_API", effective_at: "2026-03-01", created_at: "", updated_at: "" },
        { id: 3, currency_code: "USD", rate_to_usd: 750, source: "BCV_SCRAPING", effective_at: "2026-02-01", created_at: "", updated_at: "" },
      ],
      isLoading: false,
      hasLoaded: true,
    });

    const { result } = renderHook(() => useCurrencyConversion());

    expect(result.current.getRate("USD")).toBe(800);
    expect(result.current.rates).toEqual({ USD: 800 });
  });

  it("convierte entre dos monedas usando el bolívar como pivote", () => {
    useExchangeRatesStore.setState({
      rates: [
        { id: 1, currency_code: "USD", rate_to_usd: 100, source: "BCV_SCRAPING", effective_at: "2026-01-01", created_at: "", updated_at: "" },
        { id: 2, currency_code: "EUR", rate_to_usd: 108, source: "BCV_SCRAPING", effective_at: "2026-01-01", created_at: "", updated_at: "" },
      ],
      isLoading: false,
      hasLoaded: true,
    });

    const { result } = renderHook(() => useCurrencyConversion());

    // 100 EUR * 108 Bs/EUR / 100 Bs/USD = 108 USD
    expect(result.current.convertBetween(100, "EUR", "USD")).toBeCloseTo(108, 6);
  });

  it("devuelve 0 y no revienta si falta la tasa de alguna moneda", () => {
    const { result } = renderHook(() => useCurrencyConversion());

    expect(result.current.convert(100, "USD")).toBe(0);
    expect(result.current.convertBetween(100, "EUR", "USD")).toBe(0);
    expect(result.current.getRate("USD")).toBeNull();
    expect(result.current.hasRates).toBe(false);
  });
});
