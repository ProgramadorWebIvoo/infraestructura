import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FrozenRateBadge from "@/components/UI/FrozenRateBadge";
import type { RateFreeze } from "@/types";

function makeFreeze(overrides: Partial<RateFreeze> = {}): RateFreeze {
  return {
    id: 1,
    trigger: "CONTRATADO",
    baseCurrency: "USD",
    frozenRate: 100,
    frozenCurrency: "USD",
    frozenAmount: 1000,
    frozenAmountBs: null,
    frozenAmountBase: 1000,
    source: "AUTO",
    reason: null,
    frozenAt: "2026-01-15T00:00:00Z",
    frozenByName: null,
    supersededById: null,
    ...overrides,
  };
}

describe("FrozenRateBadge", () => {
  it("muestra la tasa congelada formateada", () => {
    render(<FrozenRateBadge freeze={makeFreeze({ frozenRate: 108.5 })} />);
    expect(screen.getByText(/1 USD = 108,50 Bs\./)).toBeInTheDocument();
  });

  it("muestra la moneda del monto congelado y su tasa, no la de la base", () => {
    render(<FrozenRateBadge freeze={makeFreeze({ frozenCurrency: "USDT", frozenRate: 1000, frozenAmount: 1200, frozenAmountBs: 1200000 })} />);
    expect(screen.getByText(/1 USDT = 1\.000,00 Bs\./)).toBeInTheDocument();
  });

  it("muestra 'Congelado' cuando no hay tasa registrada (sin BCV disponible al momento del freeze)", () => {
    render(<FrozenRateBadge freeze={makeFreeze({ frozenRate: null })} />);
    expect(screen.getByText("Congelado")).toBeInTheDocument();
  });
});
