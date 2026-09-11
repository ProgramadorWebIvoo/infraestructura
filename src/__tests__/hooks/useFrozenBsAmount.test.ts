import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useFrozenBsAmount, activeFreezeFor } from "@/hooks/useFrozenBsAmount";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import type { RateFreeze } from "@/types";

function makeFreeze(overrides: Partial<RateFreeze> = {}): RateFreeze {
  return {
    id: 1,
    trigger: "CONTRATADO",
    baseCurrency: "USD",
    frozenRate: 100,
    frozenAmountBase: 1000,
    source: "AUTO",
    reason: null,
    frozenAt: "2026-01-01T00:00:00Z",
    frozenByName: null,
    supersededById: null,
    ...overrides,
  };
}

describe("useFrozenBsAmount", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({
      rates: [{ id: 1, currency_code: "USD", rate_to_usd: 500, source: "BCV_SCRAPING", effective_at: "2026-06-01", created_at: "", updated_at: "" }],
      isLoading: false,
      hasLoaded: true,
    });
  });

  it("usa la tasa congelada (no la tasa en vivo) cuando hay un freeze vigente para el trigger", () => {
    const freezes = [makeFreeze({ frozenRate: 100 })];

    const { result } = renderHook(() => useFrozenBsAmount(1000, freezes, "CONTRATADO"));

    // 1000 * 100 (congelada) = 100000, NO 1000 * 500 (tasa en vivo actual)
    expect(result.current.bs).toBe(100000);
    expect(result.current.isFrozen).toBe(true);
    expect(result.current.freeze?.id).toBe(1);
  });

  it("ignora un freeze ya superseded (no vigente) y usa la tasa en vivo", () => {
    const freezes = [makeFreeze({ frozenRate: 100, supersededById: 2 })];

    const { result } = renderHook(() => useFrozenBsAmount(1000, freezes, "CONTRATADO"));

    expect(result.current.isFrozen).toBe(false);
    expect(result.current.bs).toBe(500000); // 1000 * 500 (tasa en vivo)
  });

  it("ignora un freeze de un trigger distinto", () => {
    const freezes = [makeFreeze({ trigger: "PAGO_ANTICIPO" })];

    const { result } = renderHook(() => useFrozenBsAmount(1000, freezes, "CONTRATADO"));

    expect(result.current.isFrozen).toBe(false);
  });

  it("cae a la tasa en vivo cuando no hay ningún freeze", () => {
    const { result } = renderHook(() => useFrozenBsAmount(1000, undefined, "CONTRATADO"));

    expect(result.current.isFrozen).toBe(false);
    expect(result.current.bs).toBe(500000);
    expect(result.current.formatted).toContain("Bs.");
  });

  it("activeFreezeFor devuelve solo la fila vigente (supersededById null) de ese trigger", () => {
    const old = makeFreeze({ id: 1, supersededById: 2 });
    const active = makeFreeze({ id: 2, supersededById: null });

    expect(activeFreezeFor([old, active], "CONTRATADO")?.id).toBe(2);
  });
});
