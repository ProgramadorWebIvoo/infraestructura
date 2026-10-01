import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductLinesTable, { type ProductColumn } from "@/components/UI/ProductLinesTable";

interface Line {
  id: number;
  name: string;
  price: number;
}

const makeLines = (n: number): Line[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: i === 4 ? "Cabilla ácida" : `Producto ${String(i + 1).padStart(2, "0")}`, price: i % 2 === 0 ? 0 : 10 }));

const columns: ProductColumn<Line>[] = [
  { key: "name", label: "Producto", render: (row) => row.name },
  { key: "idx", label: "Índice", render: (_row, index) => <span data-testid="idx">{index}</span> },
];

function Table({ lines, pageSize = 15 }: { lines: Line[]; pageSize?: number }) {
  return (
    <ProductLinesTable
      items={lines}
      columns={columns}
      rowKey={(row) => row.id}
      pageSize={pageSize}
      searchText={(row) => row.name}
      filters={[{ key: "unpriced", label: "Sin precio", predicate: (row) => row.price === 0 }]}
      summary={<span>Total fijo</span>}
      ariaLabel="Productos"
    />
  );
}

const rowCount = () => within(screen.getByRole("table")).getAllByRole("row").length - 1; // sin cabecera

describe("ProductLinesTable", () => {
  it("muestra solo una página y el resumen siempre visible", () => {
    render(<Table lines={makeLines(70)} />);
    expect(rowCount()).toBe(15);
    expect(screen.getByText("Total fijo")).toBeInTheDocument();
    expect(screen.getByText(/de/, { selector: "span.hidden" })).toHaveTextContent("70");
  });

  it("pasa a render el índice original, no el de la página", async () => {
    render(<Table lines={makeLines(40)} pageSize={10} />);
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getAllByTestId("idx")[0]).toHaveTextContent("10");
  });

  it("busca sin distinguir acentos y filtra la lista", async () => {
    render(<Table lines={makeLines(70)} />);
    await userEvent.type(screen.getByRole("searchbox"), "acida");
    expect(rowCount()).toBe(1);
    expect(screen.getByText("Cabilla ácida")).toBeInTheDocument();
  });

  it("muestra mensaje cuando la búsqueda no tiene resultados", async () => {
    render(<Table lines={makeLines(20)} />);
    await userEvent.type(screen.getByRole("searchbox"), "zzzz");
    expect(screen.getByText("No hay productos que coincidan.")).toBeInTheDocument();
  });

  it("los filtros rápidos muestran su conteo y filtran", async () => {
    render(<Table lines={makeLines(70)} />);
    const chip = screen.getByRole("button", { name: /Sin precio/ });
    expect(chip).toHaveTextContent("35");
    await userEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/de/, { selector: "span.hidden" })).toHaveTextContent("35");
  });

  it("no reinicia la página al editar una fila (cambia items)", async () => {
    function Editable() {
      const [lines, setLines] = useState(makeLines(40));
      return (
        <ProductLinesTable
          items={lines}
          pageSize={10}
          rowKey={(row) => row.id}
          ariaLabel="Editable"
          columns={[
            {
              key: "price",
              label: "Precio",
              render: (row, index) => (
                <input aria-label={`precio-${row.id}`} value={row.price} onChange={(e) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, price: Number(e.target.value) || 0 } : l)))} />
              ),
            },
          ]}
        />
      );
    }
    render(<Editable />);
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    const field = screen.getByLabelText("precio-11");
    await userEvent.type(field, "5");
    expect(screen.getByLabelText("precio-11")).toBeInTheDocument(); // sigue en la página 2
    expect(screen.queryByLabelText("precio-1")).not.toBeInTheDocument();
  });

  it("buscar vuelve a la primera página", async () => {
    render(<Table lines={makeLines(40)} pageSize={10} />);
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await userEvent.type(screen.getByRole("searchbox"), "Producto 0");
    expect(screen.getByText("Producto 01")).toBeInTheDocument();
  });
});
