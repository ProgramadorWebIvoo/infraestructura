import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClosureFinalQuantities from "@/components/ClosureReport/ClosureFinalQuantities";
import type { ClosureReportItem } from "@/components/ClosureReport/types";

let mockState: { report: { items: ClosureReportItem[] } | null; isLoading: boolean };
vi.mock("@/hooks/useClosureReport", () => ({ useClosureReport: () => mockState }));

const makeItems = (n: number, adjustedIds: number[] = []): ClosureReportItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Partida ${String(i + 1).padStart(2, "0")}`,
    unit: "und",
    contractedQuantity: 100,
    executedQuantity: 100,
    residentQuantity: adjustedIds.includes(i + 1) ? 90 : 100,
    finalQuantity: adjustedIds.includes(i + 1) ? 90 : 100,
    unitPriceUsd: 2,
    note: null,
  }));

const setup = () => render(<ClosureFinalQuantities projectId="P1" authToken="t" />);

describe("ClosureFinalQuantities", () => {
  beforeEach(() => {
    mockState = { report: { items: makeItems(70, [3, 10, 20, 30, 40, 50, 60]) }, isLoading: false };
  });

  it("con 70 partidas no lista todo: resume el conteo y solo las primeras ajustadas", () => {
    setup();
    expect(screen.getByText(/7 de 70 ajustadas/)).toBeInTheDocument();
    const items = within(screen.getByTestId("closure-final-quantities")).getAllByRole("listitem");
    expect(items).toHaveLength(5); // 4 partidas + la línea «y N más»
    expect(screen.getByText("y 3 partidas más ajustadas…")).toBeInTheDocument();
    expect(screen.queryByText("Partida 02")).not.toBeInTheDocument();
  });

  it("indica la diferencia con signo en cada partida ajustada", () => {
    setup();
    expect(screen.getAllByText("(-10)").length).toBeGreaterThan(0);
  });

  it("si nada se ajustó, solo muestra que están completas", () => {
    mockState = { report: { items: makeItems(70) }, isLoading: false };
    setup();
    expect(screen.getByText(/todas las partidas completas/)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("'Ver las 70 partidas' abre la tabla completa paginada con buscador y filtro", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Ver las 70 partidas" }));

    const dialog = screen.getByRole("dialog");
    const table = within(dialog).getByRole("table", { name: "Cantidades finales verificadas" });
    expect(within(table).getAllByRole("row")).toHaveLength(16); // cabecera + 15

    await userEvent.click(within(dialog).getByRole("button", { name: /Solo ajustadas/ }));
    expect(within(table).getAllByRole("row")).toHaveLength(8); // cabecera + 7

    await userEvent.type(within(dialog).getByRole("searchbox"), "Partida 60");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
  });

  it("no renderiza nada sin informe o sin partidas", () => {
    mockState = { report: null, isLoading: false };
    const { container } = setup();
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra un spinner mientras carga", () => {
    mockState = { report: null, isLoading: true };
    setup();
    expect(screen.getByLabelText("Cargando cantidades finales")).toBeInTheDocument();
  });
});
