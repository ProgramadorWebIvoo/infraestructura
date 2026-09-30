import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PaymentSettlementForm from "@/views/FinanzasPanel/components/PaymentSettlementForm";
import { usePaymentSettlement } from "@/hooks/usePaymentSettlement";
import { useExchangeRatesStore } from "@/stores/exchangeRatesStore";
import { useUsdRateModeStore } from "@/stores/usdRateModeStore";

vi.mock("@/services/api", () => ({ apiFetch: vi.fn().mockResolvedValue([
  { code: "USD", name: "Dólar", symbol: "$", isBase: true },
  { code: "EUR", name: "Euro", symbol: "€", isBase: false },
  { code: "USDT", name: "Tether", symbol: "₮", isBase: false },
]) }));

const rate = (id: number, code: string, value: number) => ({ id, currency_code: code, rate_to_usd: value, source: "DOLARVZLA_API" as const, effective_at: "2026-01-01", created_at: "", updated_at: "" });
const OBLIGATION = { amount: 360, currency: "USDT" };

function Harness() {
  const settlement = usePaymentSettlement(OBLIGATION);
  return <PaymentSettlementForm settlement={settlement} obligation={OBLIGATION} />;
}

describe("PaymentSettlementForm (rediseño: nada editable salvo el modo y la moneda)", () => {
  beforeEach(() => {
    useExchangeRatesStore.setState({ rates: [rate(1, "USD", 800), rate(2, "USDT", 1000)], isLoading: false, hasLoaded: true });
    useUsdRateModeStore.setState({ mode: "BCV", sessionRole: null });
  });

  it("en la moneda cotizada no hay ningún campo de monto, tasa ni diferencia", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("radio", { name: /moneda cotizada/i }));

    expect(screen.queryByLabelText(/Monto/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Tasa aplicada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Diferencia/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Motivo de la diferencia/)).not.toBeInTheDocument();
  });

  it("en bolívares la tasa y el monto son de solo lectura, sin selector de origen de tasa", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("radio", { name: /bolívares/i }));

    const rateField = screen.getByLabelText(/Tasa aplicada/) as HTMLInputElement;
    const amountField = screen.getByLabelText(/Monto a pagar/) as HTMLInputElement;
    expect(rateField).toHaveAttribute("readonly");
    expect(amountField).toHaveAttribute("readonly");
    expect(rateField.value).toBe("1.000");
    expect(amountField.value).toBe("Bs. 360.000,00");
    expect(screen.queryByLabelText(/Origen de la tasa/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Diferencia/)).not.toBeInTheDocument();
  });

  it("en otra moneda se elige la moneda y la tasa y el monto salen de solo lectura", async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("radio", { name: /otra moneda/i }));
    expect(await screen.findByLabelText(/Moneda pagada/)).toBeInTheDocument();
    // Sin moneda elegida todavía no hay tasa que mostrar.
    expect(screen.queryByLabelText(/Tasa aplicada/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Origen de la tasa/)).not.toBeInTheDocument();
  });
});
