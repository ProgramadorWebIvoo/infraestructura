import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";

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

  describe("modo de tasa USD (BCV / USDT)", () => {
    const seedRates = () =>
      useExchangeRatesStore.setState({
        rates: [
          { id: 1, currency_code: "USD", rate_to_usd: 100, source: "DOLARVZLA_API", effective_at: "2026-01-01", created_at: "", updated_at: "" },
          { id: 2, currency_code: "EUR", rate_to_usd: 110, source: "DOLARVZLA_API", effective_at: "2026-01-01", created_at: "", updated_at: "" },
          { id: 3, currency_code: "USDT", rate_to_usd: 120, source: "USDT_COM_VE:binance", effective_at: "2026-01-01", created_at: "", updated_at: "" },
        ],
        isLoading: false,
        hasLoaded: true,
      });

    beforeEach(() => {
      useUsdRateModeStore.setState({ mode: "BCV" });
    });

    it("por defecto convierte USD con la tasa BCV", () => {
      seedRates();
      const { result } = renderHook(() => useCurrencyConversion());

      expect(result.current.usdRateMode).toBe("BCV");
      expect(result.current.convert(10, "USD")).toBe(1000);
    });

    it("en modo USDT convierte USD con la tasa USDT y deja EUR y convertBetween en BCV", () => {
      seedRates();
      useUsdRateModeStore.setState({ mode: "USDT" });
      const { result } = renderHook(() => useCurrencyConversion());

      expect(result.current.usdRateMode).toBe("USDT");
      expect(result.current.convert(10, "USD")).toBe(1200);
      expect(result.current.convert(10, "EUR")).toBe(1100);
      expect(result.current.convertBetween(100, "EUR", "USD")).toBeCloseTo(110, 6);
    });

    it("setUsdRateMode cambia el modo", () => {
      seedRates();
      const { result } = renderHook(() => useCurrencyConversion());

      act(() => result.current.setUsdRateMode("USDT"));

      expect(result.current.usdRateMode).toBe("USDT");
      expect(result.current.convert(1, "USD")).toBe(120);
    });

    it("cae a BCV si se eligió USDT pero no hay tasa USDT", () => {
      useExchangeRatesStore.setState({
        rates: [{ id: 1, currency_code: "USD", rate_to_usd: 100, source: "DOLARVZLA_API", effective_at: "2026-01-01", created_at: "", updated_at: "" }],
        isLoading: false,
        hasLoaded: true,
      });
      useUsdRateModeStore.setState({ mode: "USDT" });
      const { result } = renderHook(() => useCurrencyConversion());

      expect(result.current.hasUsdtRate).toBe(false);
      expect(result.current.usdRateMode).toBe("BCV");
      expect(result.current.convert(10, "USD")).toBe(1000);
    });
  });

  it("devuelve 0 y no revienta si falta la tasa de alguna moneda", () => {
    const { result } = renderHook(() => useCurrencyConversion());

    expect(result.current.convert(100, "USD")).toBe(0);
    expect(result.current.convertBetween(100, "EUR", "USD")).toBe(0);
    expect(result.current.getRate("USD")).toBeNull();
    expect(result.current.hasRates).toBe(false);
  });
});
