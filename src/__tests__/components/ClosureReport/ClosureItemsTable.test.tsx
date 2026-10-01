import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClosureItemsTable from "@/components/ClosureReport/ClosureItemsTable";
import { initialDrafts, measurementErrors, type MeasurementDraft, type MeasurementDrafts } from "@/components/ClosureReport/closureMeasurements";
import type { ClosureReportItem } from "@/components/ClosureReport/types";

const makeItems = (n: number): ClosureReportItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Partida ${String(i + 1).padStart(2, "0")}`,
    unit: "und",
    contractedQuantity: 100,
    executedQuantity: 100,
    unitPriceUsd: 2,
    note: null,
  }));

const rows = () => within(screen.getByRole("table", { name: "Comparación de partidas del cierre" })).getAllByRole("row").length - 1;

function ResidentHarness({ items }: { items: ClosureReportItem[] }) {
  const [drafts, setDrafts] = useState<MeasurementDrafts>(() => initialDrafts(items));
  const onDraftChange = (id: number, patch: Partial<MeasurementDraft>) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  return <ClosureItemsTable items={items} mode="resident" drafts={drafts} errors={measurementErrors(items, drafts)} onDraftChange={onDraftChange} />;
}

describe("ClosureItemsTable — 70 partidas", () => {
  it("solo muestra una página de filas en lugar de las 70", () => {
    render(<ClosureItemsTable items={makeItems(70)} />);
    expect(rows()).toBe(15);
  });

  it("el buscador encuentra una partida de otra página", async () => {
    render(<ClosureItemsTable items={makeItems(70)} />);
    await userEvent.type(screen.getByRole("searchbox"), "Partida 68");
    expect(rows()).toBe(1);
    expect(screen.getByTestId("closure-item-68")).toBeInTheDocument();
  });

  it("'Con diferencias' deja solo las partidas que se apartan de lo contratado", async () => {
    const items = makeItems(40);
    items[30] = { ...items[30], executedQuantity: 80, note: "Menos puntos" };
    render(<ClosureItemsTable items={items} />);

    await userEvent.click(screen.getByRole("button", { name: /Con diferencias/ }));
    expect(rows()).toBe(1);
    expect(screen.getByText(/Menos puntos/)).toBeInTheDocument();
  });
});

describe("ClosureItemsTable — modo residente", () => {
  it("pide justificación solo en la partida cuya medida difiere de lo contratado", async () => {
    render(<ResidentHarness items={makeItems(30)} />);
    expect(screen.queryByLabelText(/Justificación de Partida 01/)).not.toBeInTheDocument();

    await userEvent.type(document.querySelector("#closure-qty-1") as HTMLInputElement, "90");
    expect(screen.getByLabelText("Justificación de Partida 01")).toBeInTheDocument();
    expect(screen.getByText("Justifique el aumento o la disminución respecto a lo contratado.")).toBeInTheDocument();
  });

  it("'Con errores' llega a las partidas pendientes aunque estén en otra página", async () => {
    render(<ResidentHarness items={makeItems(30)} />);
    // Todas empiezan sin medir (error "Registre la cantidad verificada."): el filtro las lista todas.
    await userEvent.click(screen.getByRole("button", { name: /Con errores/ }));
    expect(screen.getByRole("button", { name: /Con errores/ })).toHaveTextContent("30");

    await userEvent.type(document.querySelector("#closure-qty-1") as HTMLInputElement, "100");
    expect(screen.getByRole("button", { name: /Con errores/ })).toHaveTextContent("29");
  });
});
