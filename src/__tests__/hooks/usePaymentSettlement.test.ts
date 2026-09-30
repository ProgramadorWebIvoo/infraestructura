import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePaymentSettlement } from "@/hooks/usePaymentSettlement";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";

const rate = (id: number, code: string, value: number) => ({
  id,
  currency_code: code,
  rate_to_usd: value,
  source: "DOLARVZLA_API" as const,
  effective_at: "2026-01-01",
  created_at: "",
  updated_at: "",
});

// Obligación de 360 USDT (anticipo del 30% de 1.200 USDT).
const USDT_OBLIGATION = { amount: 360, currency: "USDT" };
const USD_OBLIGATION = { amount: 3000, currency: "USD" };

describe("usePaymentSettlement", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)], isLoading: false, hasLoaded: true });
    usePublicSettingsStore.setState({ settings: { sincronizacion_tasa: [{ key: "tasa_switch_roles", value: JSON.stringify(["FINANZAS"]) }] } });
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: "FINANZAS" });
  });

  it("sin modo elegido no es válido y no genera payload", () => {
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));

    expect(result.current.isValid).toBe(false);
    expect(result.current.payload).toBeNull();
  });

  it("pagado en la moneda cotizada no pide nada: paga la obligación tal cual y solo envía modo y monto", () => {
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));

    act(() => result.current.setMode("QUOTE_CURRENCY"));

    expect(result.current.isConversion).toBe(false);
    expect(result.current.paidAmount).toBe(360);
    expect(result.current.payload).toEqual({ paymentMode: "QUOTE_CURRENCY", paidAmount: 360 });
  });

  it("en bolívares deriva tasa y monto de la tasa del sistema (solo lectura)", () => {
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));

    act(() => result.current.setMode("BS"));

    expect(result.current.paidCurrency).toBe("VES");
    expect(result.current.appliedRate).toBe(1000); // tasa USDT
    expect(result.current.paidAmount).toBe(360000);
    expect(result.current.rateSource).toBe("USDT");
    expect(result.current.payload).toEqual({ paymentMode: "BS", paidAmount: 360000, appliedRate: 1000, appliedRateSource: "USDT" });
  });

  it("una obligación en USD pagada en bolívares usa la tasa BCV, o la USDT si el switch está en USDT", () => {
    const bcv = renderHook(() => usePaymentSettlement(USD_OBLIGATION));
    act(() => bcv.result.current.setMode("BS"));
    expect(bcv.result.current.appliedRate).toBe(800);
    expect(bcv.result.current.rateSource).toBe("BCV");

    act(() => useUsdRateModeStore.setState({ mode: "USDT" }));
    const usdt = renderHook(() => usePaymentSettlement(USD_OBLIGATION));
    act(() => usdt.result.current.setMode("BS"));
    expect(usdt.result.current.appliedRate).toBe(1000);
    expect(usdt.result.current.rateSource).toBe("USDT");
  });

  it("en otra moneda exige elegirla y deriva la tasa entre ambas", () => {
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));

    act(() => result.current.setMode("OTHER_CURRENCY"));
    expect(result.current.isValid).toBe(false);
    expect(result.current.payload).toBeNull();

    act(() => result.current.setPaidCurrency("USD"));

    // 1 USDT = 1.000 / 800 = 1,25 USD → 360 USDT = 450 USD
    expect(result.current.appliedRate).toBe(1.25);
    expect(result.current.paidAmount).toBe(450);
    expect(result.current.payload).toEqual({ paymentMode: "OTHER_CURRENCY", paidAmount: 450, paidCurrency: "USD", appliedRate: 1.25, appliedRateSource: "USDT" });
  });

  it("sin tasa para la moneda elegida no se puede pagar en ella", () => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800)] });
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));

    act(() => result.current.setMode("BS"));

    expect(result.current.appliedRate).toBeNull();
    expect(result.current.isValid).toBe(false);
    expect(result.current.payload).toBeNull();
  });

  it("agrega banco y referencia solo si se llenaron", () => {
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));
    act(() => result.current.setMode("QUOTE_CURRENCY"));

    act(() => {
      result.current.setField("bank", "Binance");
      result.current.setField("reference", " TX-1 ");
    });

    expect(result.current.payload).toEqual({ paymentMode: "QUOTE_CURRENCY", paidAmount: 360, bank: "Binance", reference: "TX-1" });
  });

  it("cambiar de modo descarta la moneda elegida y reset vuelve al estado inicial", () => {
    const { result } = renderHook(() => usePaymentSettlement(USDT_OBLIGATION));
    act(() => result.current.setMode("OTHER_CURRENCY"));
    act(() => result.current.setPaidCurrency("USD"));

    act(() => result.current.setMode("BS"));
    expect(result.current.state.paidCurrency).toBe("");

    act(() => result.current.reset());
    expect(result.current.mode).toBeNull();
    expect(result.current.payload).toBeNull();
  });
});
