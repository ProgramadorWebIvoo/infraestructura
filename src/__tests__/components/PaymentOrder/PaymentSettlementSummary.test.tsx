import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentSettlementSummary from "@/components/PaymentOrder/PaymentSettlementSummary";
import type { PaymentSettlement } from "@/types";

const BASE: PaymentSettlement = {
  id: 1,
  type: "ADVANCE",
  paidDate: "2026-09-30",
  bank: "Banesco",
  reference: "REF-9",
  notes: null,
  amountBase: 450,
  baseCurrency: "USD",
  paymentMode: "BS",
  obligationAmount: 360,
  obligationCurrency: "USDT",
  paidCurrency: "VES",
  paidAmount: 340000,
  appliedRate: 960,
  appliedRateSource: "MANUAL",
  suggestedRate: 1000,
  coveredAmount: 354.17,
  differenceAmount: -5.83,
  differenceReason: "Comisión bancaria",
};

describe("PaymentSettlementSummary", () => {
  it("indica que un pago anterior al registro no tiene detalle de moneda", () => {
    render(<PaymentSettlementSummary settlement={{ ...BASE, paymentMode: null, paidCurrency: null, paidAmount: null }} />);

    expect(screen.getByText(/anterior al registro de liquidación/i)).toBeInTheDocument();
  });

  it("muestra lo pagado en bolívares con la tasa aplicada frente a la sugerida", () => {
    render(<PaymentSettlementSummary settlement={BASE} />);

    expect(screen.getByText(/Bs\. 340\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/1 USDT = 960 Bs\./)).toBeInTheDocument();
    expect(screen.getByText(/sugerida 1\.000/)).toBeInTheDocument();
  });

  it("muestra la diferencia contra la obligación y su motivo", () => {
    render(<PaymentSettlementSummary settlement={BASE} />);

    expect(screen.getByText(/diferencia -₮5\.83 USDT/)).toBeInTheDocument();
    expect(screen.getByText(/Motivo de la diferencia: Comisión bancaria/)).toBeInTheDocument();
  });

  it("pagado en la moneda cotizada no muestra tasa de conversión", () => {
    render(
      <PaymentSettlementSummary
        settlement={{ ...BASE, paymentMode: "QUOTE_CURRENCY", paidCurrency: "USDT", paidAmount: 360, appliedRate: 1, appliedRateSource: null, coveredAmount: 360, differenceAmount: 0, differenceReason: null }}
      />,
    );

    expect(screen.queryByText(/Tasa aplicada/)).not.toBeInTheDocument();
    expect(screen.getByText(/En la moneda cotizada/)).toBeInTheDocument();
  });

  it("muestra las tasas congeladas de la cotización y del pago cuando existen", () => {
    const freeze = (trigger: "CONTRATADO" | "PAGO_ANTICIPO", rate: number) => ({
      id: 1,
      trigger,
      baseCurrency: "USD",
      frozenRate: rate,
      frozenAmountBase: 450,
      source: "AUTO" as const,
      reason: null,
      frozenAt: "2026-09-30T10:00:00Z",
      frozenByName: null,
      supersededById: null,
    });
    render(<PaymentSettlementSummary settlement={{ ...BASE, contractRateFreeze: freeze("CONTRATADO", 800), paymentRateFreeze: freeze("PAGO_ANTICIPO", 810) }} />);

    expect(screen.getByText("Cotización")).toBeInTheDocument();
    expect(screen.getByText("Pago")).toBeInTheDocument();
  });
});
