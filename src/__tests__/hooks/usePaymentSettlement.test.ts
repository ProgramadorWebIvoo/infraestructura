import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePaymentSettlement } from "@/hooks/usePaymentSettlement";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";

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
const OBLIGATION = { amount: 360, currency: "USDT" };

describe("usePaymentSettlement", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({
      rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)],
      isLoading: false,
      hasLoaded: true,
    });
  });

  it("sin modo elegido no es válido y no genera payload", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));

    expect(result.current.isValid).toBe(false);
    expect(result.current.payload).toBeNull();
  });

  it("pagado en la moneda cotizada precarga la obligación y solo envía modo y monto", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));

    act(() => result.current.setMode("QUOTE_CURRENCY"));

    expect(result.current.isValid).toBe(true);
    expect(result.current.difference).toBe(0);
    expect(result.current.payload).toEqual({ paymentMode: "QUOTE_CURRENCY", paidAmount: 360 });
  });

  it("en bolívares precarga la tasa sugerida y el monto que resulta de ella", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));

    act(() => result.current.setMode("BS"));

    expect(result.current.paidCurrency).toBe("VES");
    expect(result.current.state.appliedRate).toBe(1000);
    expect(result.current.state.paidAmount).toBe(360000);
    expect(result.current.suggested).toBe(1000);
    expect(result.current.payload).toEqual({ paymentMode: "BS", paidAmount: 360000, appliedRate: 1000, appliedRateSource: "BCV" });
  });

  it("una diferencia exige motivo y viaja en el payload", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));
    act(() => result.current.setMode("BS"));

    act(() => {
      result.current.setField("appliedRate", 960);
      result.current.setField("paidAmount", 340000);
    });

    expect(result.current.covered).toBe(354.17);
    expect(result.current.difference).toBe(-5.83);
    expect(result.current.needsReason).toBe(true);
    expect(result.current.isValid).toBe(false);

    act(() => result.current.setField("differenceReason", "Comisión bancaria"));

    expect(result.current.isValid).toBe(true);
    expect(result.current.payload).toMatchObject({ differenceReason: "Comisión bancaria", appliedRate: 960, paidAmount: 340000 });
  });

  it("en otra moneda exige elegirla y la envía", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));

    act(() => result.current.setMode("OTHER_CURRENCY"));
    expect(result.current.isValid).toBe(false);

    act(() => result.current.setPaidCurrency("USD"));

    // 1 USDT = 1,25 USD → 360 USDT = 450 USD
    expect(result.current.state.appliedRate).toBe(1.25);
    expect(result.current.state.paidAmount).toBe(450);
    expect(result.current.payload).toMatchObject({ paymentMode: "OTHER_CURRENCY", paidCurrency: "USD", paidAmount: 450, appliedRate: 1.25 });
  });

  it("agrega banco y referencia solo si se llenaron", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));
    act(() => result.current.setMode("QUOTE_CURRENCY"));

    act(() => {
      result.current.setField("bank", "Binance");
      result.current.setField("reference", " TX-1 ");
    });

    expect(result.current.payload).toEqual({ paymentMode: "QUOTE_CURRENCY", paidAmount: 360, bank: "Binance", reference: "TX-1" });
  });

  it("reset vuelve al estado inicial", () => {
    const { result } = renderHook(() => usePaymentSettlement(OBLIGATION));
    act(() => result.current.setMode("BS"));

    act(() => result.current.reset());

    expect(result.current.mode).toBeNull();
    expect(result.current.payload).toBeNull();
  });
});
