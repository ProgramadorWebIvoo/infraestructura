import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClosureItemsTable from "@/components/ClosureReport/ClosureItemsTable";
import type { ClosureReportItem } from "@/components/ClosureReport/types";
import { signedQuantity } from "@/views/InfraestructuraMantenimientoPanel/components/modificationUtils";

const item = (over: Partial<ClosureReportItem>): ClosureReportItem => ({
  id: 1, name: "Cable", unit: "m", contractedQuantity: 100, executedQuantity: 100, unitPriceUsd: 2, note: null, ...over,
});

describe("ClosureItemsTable — modificaciones de obra (F3)", () => {
  it("muestra original, variación y vigente cuando hubo modificación", () => {
    render(<ClosureItemsTable items={[item({ contractedQuantity: 108, originalQuantity: 100, modificationQuantity: 8 })]} />);
    expect(screen.getByTestId("closure-modification-1")).toHaveTextContent("100 + 8 modif.");
  });

  it("indica las disminuciones con signo negativo", () => {
    render(<ClosureItemsTable items={[item({ contractedQuantity: 90, originalQuantity: 100, modificationQuantity: -10 })]} />);
    expect(screen.getByTestId("closure-modification-1")).toHaveTextContent("100 − 10 modif.");
  });

  it("no agrega nada si la partida no fue modificada", () => {
    render(<ClosureItemsTable items={[item({ originalQuantity: 100, modificationQuantity: 0 })]} />);
    expect(screen.queryByTestId("closure-modification-1")).toBeNull();
  });
});

describe("signedQuantity", () => {
  it("suma aumentos y resta disminuciones", () => {
    expect(signedQuantity("AUMENTO", 3)).toBe(3);
    expect(signedQuantity("DISMINUCION", 3)).toBe(-3);
  });
});
