/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para Table — sorting, pagination, row selection.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Table, type Column } from "@/components/UI/Table";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface TestRow {
  id: number;
  name: string;
  value: number;
  status: "active" | "inactive";
}

const columns: Column<TestRow>[] = [
  { key: "id", label: "ID", sortable: true, width: "4rem", align: "center" },
  { key: "name", label: "Nombre", sortable: true },
  { key: "value", label: "Valor", sortable: true, align: "right" },
  {
    key: "status",
    label: "Estado",
    render: (row) => (
      <span className={row.status === "active" ? "text-green-600" : "text-red-600"}>
        {row.status}
      </span>
    ),
  },
];

const testData: TestRow[] = [
  { id: 3, name: "Charlie", value: 30, status: "inactive" },
  { id: 1, name: "Alpha", value: 10, status: "active" },
  { id: 2, name: "Beta", value: 20, status: "active" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Table", () => {
  // -----------------------------------------------------------------------
  // Renderizado básico
  // -----------------------------------------------------------------------

  it("renderiza headers con labels correctos", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Valor")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
  });

  it("renderiza filas con datos correctos", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renderiza custom render para status", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    const activeBadges = screen.getAllByText("active");
    const inactiveBadge = screen.getByText("inactive");
    expect(activeBadges).toHaveLength(2);
    activeBadges.forEach((badge) => expect(badge).toHaveClass("text-green-600"));
    expect(inactiveBadge).toHaveClass("text-red-600");
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  it("muestra skeleton rows cuando isLoading=true", () => {
    render(
      <Table columns={columns} data={[]} rowKey={(r) => r.id} isLoading loadingRows={3} />
    );

    const skeletonRows = screen.getAllByTestId("skeleton-row");
    expect(skeletonRows).toHaveLength(3);
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  it("muestra emptyMessage cuando no hay datos", () => {
    render(
      <Table columns={columns} data={[]} rowKey={(r) => r.id} emptyMessage="Sin datos" />
    );

    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("renderiza emptyState custom cuando se proporciona", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        emptyState={<div data-testid="custom-empty">Custom Empty</div>}
      />
    );

    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Sorting
  // -----------------------------------------------------------------------

  it("ordena asc por nombre al hacer click en header sortable", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    const nameHeader = screen.getByText("Nombre");
    fireEvent.click(nameHeader);

    const rows = screen.getAllByRole("row");
    // row[0] = header, row[1..] = data rows
    expect(rows[1]).toHaveTextContent("Alpha");
    expect(rows[2]).toHaveTextContent("Beta");
    expect(rows[3]).toHaveTextContent("Charlie");
  });

  it("ordena desc por nombre al hacer segundo click", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    const nameHeader = screen.getByText("Nombre");
    fireEvent.click(nameHeader); // asc
    fireEvent.click(nameHeader); // desc

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Charlie");
    expect(rows[2]).toHaveTextContent("Beta");
    expect(rows[3]).toHaveTextContent("Alpha");
  });

  it("ordena por valor numérico", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    const valorHeader = screen.getByText("Valor");
    fireEvent.click(valorHeader); // asc

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("10");
    expect(rows[2]).toHaveTextContent("20");
    expect(rows[3]).toHaveTextContent("30");
  });

  it("NO ordena en columnas no sortable", () => {
    const nonSortableColumns: Column<TestRow>[] = [
      { key: "id", label: "ID" },
      { key: "name", label: "Nombre", sortable: true },
    ];

    render(<Table columns={nonSortableColumns} data={testData} rowKey={(r) => r.id} />);

    const idHeader = screen.getByText("ID");
    fireEvent.click(idHeader);

    // No debe cambiar el orden — Charlie, Alpha, Beta
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Charlie");
    expect(rows[2]).toHaveTextContent("Alpha");
  });

  it("muestra aria-sort correcto en headers", () => {
    render(<Table columns={columns} data={testData} rowKey={(r) => r.id} />);

    const nameHeader = screen.getByText("Nombre").closest("th");
    expect(nameHeader).toHaveAttribute("aria-sort", "none");

    fireEvent.click(nameHeader!);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(nameHeader!);
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("resetea a página 1 al cambiar ordenamiento", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        pageSize={2}
      />
    );

    // Ir a página 2
    const nextButton = screen.getByLabelText("Página siguiente");
    fireEvent.click(nextButton);

    // Cambiar orden
    const nameHeader = screen.getByText("Nombre");
    fireEvent.click(nameHeader);

    // Debe estar en página 1 (texto fragmentado por spans internos, leer textContent)
    const infoSpan = container.querySelector(".text-slate-500.font-medium");
    expect(infoSpan?.textContent).toContain("Mostrando 1 — 2 de 3 registros");
  });

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------

  it("pagina correctamente con pageSize", async () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} pageSize={2} />
    );

    // Página 1: orden original [Charlie, Alpha, Beta] → primeros 2
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();

    // Página 2
    const nextButton = screen.getByLabelText("Página siguiente");
    fireEvent.click(nextButton);

    expect(screen.getByText("Beta")).toBeInTheDocument();
    // Las filas salientes animan su salida (AnimatePresence) antes de
    // desmontarse — esperar a que termine en vez de asertar sincrónicamente.
    await waitFor(() => {
      expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    });
  });

  it("muestra info de paginación correcta", () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} pageSize={2} />
    );

    expect(
      screen.getByText((content) => content.includes("Mostrando") && content.includes("registros"))
    ).toBeInTheDocument();
  });

  it("navega entre páginas con botones (pageSize=1)", async () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} pageSize={1} />
    );

    // Página 1: primer elemento = Charlie (id=3, original order)
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

    // Página 2 — las filas salientes animan su salida (AnimatePresence)
    // antes de desmontarse, así que se espera a que termine.
    fireEvent.click(screen.getByLabelText("Página siguiente"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    });

    // Página 3
    fireEvent.click(screen.getByLabelText("Página siguiente"));
    expect(screen.getByText("Beta")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    });

    // Botón anterior → vuelve a página 2
    fireEvent.click(screen.getByLabelText("Página anterior"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("deshabilita botones en primera/última página", () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} pageSize={2} />
    );

    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
    expect(screen.getByLabelText("Página siguiente")).not.toBeDisabled();

    // Última página
    fireEvent.click(screen.getByLabelText("Página siguiente"));
    expect(screen.getByLabelText("Página siguiente")).toBeDisabled();
    expect(screen.getByLabelText("Página anterior")).not.toBeDisabled();
  });

  it("click en número de página navega directamente", () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} pageSize={1} />
    );

    // Click en botón "3" (página 3)
    const pageButtons = screen.getAllByRole("button").filter((btn) => btn.textContent === "3");
    fireEvent.click(pageButtons[0]);

    expect(screen.getByText("Beta")).toBeInTheDocument(); // Beta (id=2) en página 3
  });

  // -----------------------------------------------------------------------
  // Row selection
  // -----------------------------------------------------------------------

  it("aplica selectedRowClass a fila seleccionada", () => {
    render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        selectedRowKey={1}
        selectedRowClass="bg-blue-100"
      />
    );

    const selectedRow = screen.getByText("Alpha").closest("tr");
    expect(selectedRow).toHaveClass("bg-blue-100");
  });

  it("llama onRowClick al hacer click en fila", () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />
    );

    fireEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith(testData[1], 1); // Alpha es index 1
  });

  it("llama onRowDoubleClick al doble click", () => {
    const onRowDoubleClick = vi.fn();
    render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        onRowDoubleClick={onRowDoubleClick}
      />
    );

    fireEvent.dblClick(screen.getByText("Beta"));
    expect(onRowDoubleClick).toHaveBeenCalledWith(testData[2], 2); // Beta es index 2
  });

  // -----------------------------------------------------------------------
  // Footer
  // -----------------------------------------------------------------------

  it("renderiza footer cuando se proporciona", () => {
    render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        footer={<tfoot><tr><td colSpan={4}>Total: 3</td></tr></tfoot>}
      />
    );

    expect(screen.getByText("Total: 3")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Sticky header
  // -----------------------------------------------------------------------

  it("aplica sticky header cuando stickyHeader=true", () => {
    render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        stickyHeader
      />
    );

    const headers = screen.getAllByRole("columnheader");
    headers.forEach((header) => {
      expect(header).toHaveClass("sticky");
      expect(header).toHaveClass("top-0");
    });
  });

  // -----------------------------------------------------------------------
  // Alternating rows
  // -----------------------------------------------------------------------

  it("alterna colores de fila cuando alternating=true", () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} alternating />
    );

    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveClass("bg-white");
    expect(rows[1]).toHaveClass("bg-slate-50/40");
    expect(rows[2]).toHaveClass("bg-white");
  });

  it("NO alterna cuando alternating=false", () => {
    render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} alternating={false} />
    );

    const rows = screen.getAllByRole("row").slice(1);
    rows.forEach((row) => {
      expect(row).toHaveClass("bg-white");
      expect(row).not.toHaveClass("bg-slate-50/40");
    });
  });

  // -----------------------------------------------------------------------
  // Max height y scroll
  // -----------------------------------------------------------------------

  it("aplica maxHeight cuando se proporciona", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        maxHeight="200px"
      />
    );

    const scrollContainer = container.querySelector(".overflow-y-auto");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.getAttribute("style")).toContain("max-height: 200px");
  });

  it("con fillViewport, el contenedor raíz usa flex-col h-full para ocupar el alto del padre", () => {
    const { container } = render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} fillViewport />
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass("flex", "h-full", "flex-col", "min-h-0");
  });

  it("con fillViewport, el contenedor scrolleable usa flex-1 min-h-0 (se reparte el espacio con la paginación, sin cálculo en px)", () => {
    const { container } = render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} fillViewport pageSize={2} />
    );

    const scrollContainer = container.querySelector(".overflow-y-auto");
    expect(scrollContainer).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
    // Sin fillViewport medido en JS, no debe fijar height/max-height en style.
    expect(scrollContainer?.getAttribute("style")).toBeFalsy();
  });

  it("fillViewport tiene prioridad sobre maxHeight si ambos se pasan (no aplica el maxHeight fijo)", () => {
    const { container } = render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} maxHeight="200px" fillViewport />
    );

    const scrollContainer = container.querySelector(".overflow-y-auto");
    expect(scrollContainer?.getAttribute("style") ?? "").not.toContain("200px");
    expect(scrollContainer).toHaveClass("flex-1", "min-h-0");
  });

  it("sin maxHeight ni fillViewport, el contenedor no tiene scroll vertical forzado", () => {
    const { container } = render(
      <Table columns={columns} data={testData} rowKey={(r) => r.id} />
    );

    expect(container.querySelector(".overflow-y-auto")).not.toBeInTheDocument();
  });
});
