import { describe, it, expect, vi, beforeEach } from "vitest";

const apiFetch = vi.fn();
vi.mock("@/services/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));
vi.mock("@/services/logger", () => ({ logError: vi.fn(), logWarn: vi.fn() }));

import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";

describe("exchangeRatesStore.loadPublic", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useExchangeRatesStore.setState({ rates: [], isLoading: false, hasLoaded: false });
  });

  it("carga las tasas del endpoint público sin sesión", async () => {
    apiFetch.mockResolvedValueOnce([{ id: 1, currency_code: "USD", rate_to_usd: 800, source: "DOLARVZLA_API", effective_at: "2026-01-01", created_at: "", updated_at: "" }]);

    await useExchangeRatesStore.getState().loadPublic();

    expect(apiFetch).toHaveBeenCalledWith("/public/exchange-rates");
    expect(useExchangeRatesStore.getState().rates).toHaveLength(1);
    expect(useExchangeRatesStore.getState().hasLoaded).toBe(true);
  });

  it("si falla, no rompe la página: queda sin tasas y puede reintentar", async () => {
    apiFetch.mockRejectedValueOnce(new Error("sin red"));

    await expect(useExchangeRatesStore.getState().loadPublic()).resolves.toBeUndefined();

    expect(useExchangeRatesStore.getState().rates).toEqual([]);
    expect(useExchangeRatesStore.getState().hasLoaded).toBe(false);
  });

  it("no vuelve a pedir si ya hay tasas cargadas", async () => {
    useExchangeRatesStore.setState({ hasLoaded: true });

    await useExchangeRatesStore.getState().loadPublic();

    expect(apiFetch).not.toHaveBeenCalled();
  });
});
