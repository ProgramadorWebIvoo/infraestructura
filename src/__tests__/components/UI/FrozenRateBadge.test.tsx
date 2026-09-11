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

  it("muestra 'Congelado' cuando no hay tasa registrada (sin BCV disponible al momento del freeze)", () => {
    render(<FrozenRateBadge freeze={makeFreeze({ frozenRate: null })} />);
    expect(screen.getByText("Congelado")).toBeInTheDocument();
  });
});
