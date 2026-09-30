import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));
vi.mock("@/services/logger", () => ({ logError: vi.fn() }));

const loadHook = async () => (await import("@/hooks/useQuoteCurrencyOptions")).useQuoteCurrencyOptions;

describe("useQuoteCurrencyOptions", () => {
  beforeEach(() => {
    vi.resetModules();
    apiFetch.mockReset();
  });

  it("arranca con USD/EUR y pasa a las monedas activas del catálogo, incluida USDT", async () => {
    apiFetch.mockResolvedValueOnce([
      { code: "USD", name: "Dólar", symbol: "$", isBase: true },
      { code: "EUR", name: "Euro", symbol: "€", isBase: false },
      { code: "USDT", name: "Tether", symbol: "₮", isBase: false },
    ]);
    const useQuoteCurrencyOptions = await loadHook();

    const { result } = renderHook(() => useQuoteCurrencyOptions());
    expect(result.current.map(o => o.value)).toEqual(["USD", "EUR"]);

    await waitFor(() => expect(result.current.map(o => o.value)).toEqual(["USD", "EUR", "USDT"]));
    expect(result.current[2]).toEqual({ value: "USDT", label: "USDT (₮)" });
    expect(apiFetch).toHaveBeenCalledWith("/public/currencies");
  });

  it("mantiene USD/EUR si la petición falla", async () => {
    apiFetch.mockRejectedValueOnce(new Error("sin red"));
    const useQuoteCurrencyOptions = await loadHook();

    const { result } = renderHook(() => useQuoteCurrencyOptions());

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(result.current.map(o => o.value)).toEqual(["USD", "EUR"]);
  });

  it("hace una sola petición aunque se monten varios selectores", async () => {
    apiFetch.mockResolvedValue([{ code: "USD", name: "Dólar", symbol: "$", isBase: true }]);
    const useQuoteCurrencyOptions = await loadHook();

    const first = renderHook(() => useQuoteCurrencyOptions());
    renderHook(() => useQuoteCurrencyOptions());

    await waitFor(() => expect(first.result.current.map(o => o.value)).toEqual(["USD"]));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
