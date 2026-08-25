import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddedMaterialsTable from "@/views/InfraestructuraMantenimientoPanel/components/AddedMaterialsTable";

const materials = [
  { name: "Cemento", quantity: 2, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" as const },
  { name: "Acero", quantity: 1, unit: "Cabilla", estimatedUnitPrice: 18, condition: "NUEVO" as const },
];

describe("AddedMaterialsTable", () => {
  it("renderiza una fila por material", () => {
    render(<AddedMaterialsTable materials={materials} onRemove={vi.fn()} onEditRequest={vi.fn()} reviewedIndexes={new Set()} subtotal={43} />);
    expect(screen.getByText("Cemento")).toBeInTheDocument();
    expect(screen.getByText("Acero")).toBeInTheDocument();
  });

  it("onRemove/onEditRequest se disparan con el índice correcto", () => {
    const onRemove = vi.fn();
    const onEditRequest = vi.fn();
    render(<AddedMaterialsTable materials={materials} onRemove={onRemove} onEditRequest={onEditRequest} reviewedIndexes={new Set()} subtotal={43} />);

    fireEvent.click(screen.getAllByTitle("Editar detalles")[0]);
    expect(onEditRequest).toHaveBeenCalledWith(0);

    const removeButtons = screen.getAllByRole("button").filter((b) => b.id.startsWith("btn-remove-mat-"));
    fireEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("muestra el subtotal en el footer", () => {
    render(<AddedMaterialsTable materials={materials} onRemove={vi.fn()} onEditRequest={vi.fn()} reviewedIndexes={new Set()} subtotal={43} />);
    expect(screen.getByText("$43.00")).toBeInTheDocument();
  });

  it("muestra empty state sin materiales", () => {
    render(<AddedMaterialsTable materials={[]} onRemove={vi.fn()} onEditRequest={vi.fn()} reviewedIndexes={new Set()} subtotal={0} />);
    expect(screen.getByText("Aún no agregaste materiales. Elegí del catálogo o cargá uno personalizado arriba.")).toBeInTheDocument();
  });

  it("muestra el indicador de 'sin revisar' solo en filas no incluidas en reviewedIndexes", () => {
    render(
      <AddedMaterialsTable
        materials={materials}
        onRemove={vi.fn()}
        onEditRequest={vi.fn()}
        reviewedIndexes={new Set([0])}
        subtotal={43}
      />,
    );

    expect(screen.getAllByTitle("Características sin revisar (condición, garantía, etc.)")).toHaveLength(1);
  });

  it("no muestra ningún indicador cuando todos los materiales están revisados", () => {
    render(
      <AddedMaterialsTable
        materials={materials}
        onRemove={vi.fn()}
        onEditRequest={vi.fn()}
        reviewedIndexes={new Set([0, 1])}
        subtotal={43}
      />,
    );

    expect(screen.queryByTitle("Características sin revisar (condición, garantía, etc.)")).not.toBeInTheDocument();
  });
});
