import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ConvertedAmount, { awardedProposalOf } from "@/components/UI/ConvertedAmount";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { usePublicSettingsStore } from "@/stores/publicSettingsStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";

const rate = (id: number, code: string, value: number) => ({ id, currency_code: code, rate_to_usd: value, source: "DOLARVZLA_API" as const, effective_at: "2026-01-01", created_at: "", updated_at: "" });

describe("ConvertedAmount", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)], isLoading: false, hasLoaded: true });
    usePublicSettingsStore.setState({ settings: { sincronizacion_tasa: [{ key: "tasa_switch_roles", value: JSON.stringify(["PROCURA"]) }] } });
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: "PROCURA" });
  });

  it("monto nativo en USD: solo el valor y los Bs., sin 'Cotizado'", () => {
    render(<ConvertedAmount amountBase={100} quoteCurrency="USD" fxRateToBase={1} />);

    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.queryByText(/Cotizado/)).not.toBeInTheDocument();
  });

  it("oferta en USDT: muestra el equivalente USD-BCV, el monto cotizado y sigue al switch", () => {
    // 1 USDT = 1,25 USD-BCV → 1.500 base = 1.200 USDT
    const { rerender } = render(<ConvertedAmount amountBase={1500} quoteCurrency="USDT" fxRateToBase={1.25} />);
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
    expect(screen.getByText(/Cotizado:/)).toBeInTheDocument();

    useUsdRateModeStore.setState({ mode: "USDT" });
    rerender(<ConvertedAmount amountBase={1500} quoteCurrency="USDT" fxRateToBase={1.25} />);
    expect(screen.getByText("$1,200.00")).toBeInTheDocument();
  });

  it("awardedProposalOf devuelve la propuesta seleccionada o null", () => {
    const project = { selectedProposalId: "p2", proposals: [{ id: "p1" }, { id: "p2", quoteCurrency: "USDT" }] } as never;

    expect(awardedProposalOf(project)).toMatchObject({ id: "p2" });
    expect(awardedProposalOf({ selectedProposalId: null, proposals: [] } as never)).toBeNull();
    expect(awardedProposalOf(null)).toBeNull();
  });
});
