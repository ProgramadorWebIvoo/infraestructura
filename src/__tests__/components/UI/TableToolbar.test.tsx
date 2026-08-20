/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Users } from "lucide-react";
import TableToolbar from "@/components/UI/TableToolbar";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <span {...rest}>{children}</span>;
    },
    ul: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = { ...props };
      delete rest.initial; delete rest.animate; delete rest.exit; delete rest.variants; delete rest.transition;
      return <ul {...rest}>{children}</ul>;
    },
  },
}));

describe("TableToolbar", () => {
  it("renderiza el input de búsqueda y dispara onSearchChange", () => {
    const onSearchChange = vi.fn();
    render(
      <TableToolbar
        searchId="test-search"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        countIcon={<Users />}
        filteredCount={5}
        totalCount={5}
        noun="elemento"
        nounPlural="elementos"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar..."), { target: { value: "abc" } });
    expect(onSearchChange).toHaveBeenCalledWith("abc");
  });

  it("muestra solo el total cuando filtrado === total", () => {
    render(
      <TableToolbar
        searchId="s"
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        countIcon={<Users />}
        filteredCount={5}
        totalCount={5}
        noun="elemento"
        nounPlural="elementos"
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("elementos")).toBeInTheDocument();
  });

  it("muestra la fracción filtrado/total cuando difieren", () => {
    render(
      <TableToolbar
        searchId="s"
        searchValue="a"
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        countIcon={<Users />}
        filteredCount={2}
        totalCount={5}
        noun="elemento"
        nounPlural="elementos"
      />,
    );

    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });

  it("usa el singular cuando filteredCount es 1", () => {
    render(
      <TableToolbar
        searchId="s"
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        countIcon={<Users />}
        filteredCount={1}
        totalCount={1}
        noun="elemento"
        nounPlural="elementos"
      />,
    );

    expect(screen.getByText("elemento")).toBeInTheDocument();
    expect(screen.queryByText("elementos")).not.toBeInTheDocument();
  });

  it("no renderiza el filtro cuando no se pasa `filter`", () => {
    render(
      <TableToolbar
        searchId="s"
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        countIcon={<Users />}
        filteredCount={0}
        totalCount={0}
        noun="elemento"
        nounPlural="elementos"
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renderiza el filtro y dispara su onChange al elegir una opción", () => {
    const onFilterChange = vi.fn();
    render(
      <TableToolbar
        searchId="s"
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar..."
        searchAriaLabel="Buscar"
        filter={{
          id: "status-filter",
          value: "all",
          onChange: onFilterChange,
          ariaLabel: "Filtrar por estado",
          options: [
            { value: "all", label: "Todos" },
            { value: "Active", label: "Activos" },
          ],
        }}
        countIcon={<Users />}
        filteredCount={3}
        totalCount={3}
        noun="elemento"
        nounPlural="elementos"
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Activos" }));
    expect(onFilterChange).toHaveBeenCalledWith("Active");
  });
});
