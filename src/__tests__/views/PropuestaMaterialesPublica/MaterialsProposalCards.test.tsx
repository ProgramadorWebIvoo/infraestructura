import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MaterialsProposalCards from "@/views/PropuestaMaterialesPublica/components/MaterialsProposalCards";
import type { ItemRow } from "@/views/PropuestaMaterialesPublica/types";

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn().mockResolvedValue([]),
  getApiBaseUrl: () => "http://test",
}));

const makeItems = (n: number): ItemRow[] =>
  Array.from({ length: n }, (_, i) => ({
    _id: `m-${i}`,
    materialName: `Material ${String(i + 1).padStart(2, "0")}`,
    quantity: 10,
    unit: "und",
    unitPrice: 0,
    totalPrice: 0,
    notes: "",
    isCustom: false,
    conditionStatus: "" as ItemRow["conditionStatus"],
    warrantyDescription: "",
    technicalSpecs: {},
  }));

// Misma lógica de actualización que PropuestaMaterialesPublica/index.tsx.
function Harness({ initial }: { initial: ItemRow[] }) {
  const [items, setItems] = useState(initial);
  const updateItem = (index: number, field: keyof ItemRow, value: ItemRow[keyof ItemRow]) =>
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value } as ItemRow;
      if (field === "unitPrice" || field === "quantity") {
        row.totalPrice = parseFloat(((row.unitPrice === "" ? 0 : Number(row.unitPrice)) * (row.quantity === "" ? 0 : Number(row.quantity))).toFixed(2));
      }
      next[index] = row;
      return next;
    });
  return (
    <MaterialsProposalCards
      token="tok"
      items={items}
      categories={[]}
      currencyCode="USD"
      onUpdateItem={updateItem}
      onUpdateItemSpec={() => {}}
      onAddCustomItem={() =>
        setItems((prev) => [
          ...prev,
          { _id: `custom-${prev.length}`, materialName: "", quantity: 1, unit: "", unitPrice: "", totalPrice: 0, notes: "", isCustom: true, conditionStatus: "", warrantyDescription: "", technicalSpecs: {} },
        ])
      }
      onRemoveItem={(index) => setItems((prev) => prev.filter((_, i) => i !== index))}
    />
  );
}

const rows = () => within(screen.getByRole("table", { name: "Materiales de la propuesta" })).getAllByRole("row").length - 1;

describe("MaterialsProposalCards (tabla compacta)", () => {
  it("con 70 materiales monta solo una página de filas", () => {
    render(<Harness initial={makeItems(70)} />);
    expect(rows()).toBe(15);
  });

  it("al cotizar un material sin condición/garantía marca 'Faltan datos' y lo cuenta", async () => {
    render(<Harness initial={makeItems(20)} />);
    const price = screen.getAllByPlaceholderText("0.00")[0];
    await userEvent.type(price, "12.5");
    expect(screen.getByText("Con datos faltantes").textContent).toContain("1");
    expect(screen.getAllByText("Faltan datos").length).toBeGreaterThan(0);
  });

  it("el panel de detalle permite completar condición y garantía y deja la línea completa", async () => {
    render(<Harness initial={makeItems(5)} />);
    await userEvent.type(screen.getAllByPlaceholderText("0.00")[0], "10");
    await userEvent.click(screen.getByRole("button", { name: "Abrir detalle de Material 01" }));

    await userEvent.type(screen.getByPlaceholderText(/12 meses de fábrica/), "12 meses");
    await userEvent.click(screen.getByText("Selecciona una opción..."));
    await userEvent.click(await screen.findByRole("option", { name: "Nuevo" }));
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));

    expect(screen.getByText("Completo", { selector: "span.inline-block" })).toBeInTheDocument();
  });

  it("'Siguiente con datos faltantes' salta a la próxima línea pendiente", async () => {
    render(<Harness initial={makeItems(10)} />);
    const prices = screen.getAllByPlaceholderText("0.00");
    await userEvent.type(prices[2], "5"); // Material 03
    await userEvent.type(prices[6], "5"); // Material 07
    await userEvent.click(screen.getByRole("button", { name: "Completar los que faltan" }));
    expect(screen.getByText("Material 3 de 10")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Siguiente con datos faltantes/ }));
    expect(screen.getByText("Material 7 de 10")).toBeInTheDocument();
  });

  it("agregar un material adicional abre su panel y el nombre escrito queda en la fila", async () => {
    render(<Harness initial={makeItems(3)} />);
    await userEvent.click(screen.getByRole("button", { name: /Agregar material adicional/ }));
    const nameInput = await screen.findByPlaceholderText(/Buscar en catálogo o escribir nombre nuevo/);
    await userEvent.type(nameInput, "Pegamento especial");
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(screen.getByText("Pegamento especial")).toBeInTheDocument();
  });

  it("eliminar un material adicional desde el panel lo quita de la tabla", async () => {
    render(<Harness initial={makeItems(3)} />);
    await userEvent.click(screen.getByRole("button", { name: /Agregar material adicional/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(rows()).toBe(3);
  });
});
