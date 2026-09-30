import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RateModeSwitch from "@/components/UI/RateModeSwitch";
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

describe("RateModeSwitch", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({
      rates: [rate(1, "USD", 100), { ...rate(2, "USDT", 120), source: "USDT_COM_VE:binance" }],
      isLoading: false,
      hasLoaded: true,
    });
    usePublicSettingsStore.setState({
      settings: { sincronizacion_tasa: [{ key: "tasa_switch_roles", value: JSON.stringify(["FINANZAS"]) }] },
    });
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: "FINANZAS" });
  });

  it("muestra el switch y cambia el modo global al elegir USDT", async () => {
    render(<RateModeSwitch />);

    await userEvent.click(screen.getByRole("button", { name: "USDT" }));

    expect(useUsdRateModeStore.getState().mode).toBe("USDT");
    expect(screen.getByRole("button", { name: "USDT" })).toHaveAttribute("aria-pressed", "true");
  });

  it("se oculta si el rol no está en tasa_switch_roles", () => {
    useUsdRateModeStore.setState({ sessionRole: "PROCURA" });

    const { container } = render(<RateModeSwitch />);

    expect(container).toBeEmptyDOMElement();
  });

  it("se oculta si no hay tasa USDT", () => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 100)] });

    const { container } = render(<RateModeSwitch />);

    expect(container).toBeEmptyDOMElement();
  });
});
