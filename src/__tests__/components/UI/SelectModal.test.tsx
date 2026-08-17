/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para SelectModal — search, select, deselect.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectModal from "@/components/UI/SelectModal";

// ---------------------------------------------------------------------------
// Mock motion para evitar dependencias de animación
// ---------------------------------------------------------------------------

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    tbody: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <tbody {...rest}>{children}</tbody>;
    },
    tr: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, layout, ...rest } = props;
      return <tr {...rest}>{children}</tr>;
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock createPortal de Modal
// ---------------------------------------------------------------------------

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface TestOption {
  id: number;
  code: string;
}

const options = [
  { value: 1, label: "Alpha", description: "Código A-001", raw: { id: 1, code: "A-001" } },
  { value: 2, label: "Beta", description: "Código B-002", raw: { id: 2, code: "B-002" } },
  { value: 3, label: "Charlie", description: "Código C-003", raw: { id: 3, code: "C-003" } },
  { value: 4, label: "Delta", description: "Código D-004", raw: { id: 4, code: "D-004" } },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SelectModal", () => {
  const onOpen = vi.fn();
  const onClose = vi.fn();
  const onSelect = vi.fn();
  const onDeselect = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Trigger button
  // -----------------------------------------------------------------------

  it("renderiza botón trigger con triggerLabel", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Seleccionar elemento"
        title="Seleccionar"
      />
    );

    expect(screen.getByRole("button", { name: /seleccionar elemento/i })).toBeInTheDocument();
  });

  it("llama onOpen al click en trigger", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("deshabilita trigger cuando disabled=true", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
        disabled
      />
    );

    expect(screen.getByRole("button", { name: /abrir/i })).toBeDisabled();
  });

  it("muestra label del option seleccionado en el trigger", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        selectedValue={2}
        triggerLabel="Seleccionar"
        title="Seleccionar"
      />
    );

    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Search (filtrado en cliente)
  // -----------------------------------------------------------------------

  it("filtra opciones por texto de búsqueda", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.change(searchInput, { target: { value: "Alp" } });

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("filtra también por descripción", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.change(searchInput, { target: { value: "B-002" } });

    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay resultados", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
        emptyMessage="No se encontraron coincidencias."
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.change(searchInput, { target: { value: "ZZZ" } });

    expect(screen.getByText("No se encontraron coincidencias.")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Select / confirmar selección
  // -----------------------------------------------------------------------

  it("selecciona fila al hacer click y confirma con botón", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    // Click en fila Alpha
    fireEvent.click(screen.getByText("Alpha"));

    // Click en botón Seleccionar
    fireEvent.click(screen.getByRole("button", { name: /seleccionar/i }));

    expect(onSelect).toHaveBeenCalledWith(options[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("deshabilita botón confirmar si no hay selección", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    expect(screen.getByRole("button", { name: /seleccionar/i })).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // Selección con doble click (select, no confirm)
  // -----------------------------------------------------------------------

  it("selecciona fila con doble click y confirma con botón", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    // Doble click en fila Charlie → solo selecciona (setConfirmedSelection)
    fireEvent.dblClick(screen.getByText("Charlie"));

    // Botón confirmar debe estar habilitado ahora
    expect(screen.getByRole("button", { name: /seleccionar/i })).not.toBeDisabled();

    // Confirmar
    fireEvent.click(screen.getByRole("button", { name: /seleccionar/i }));
    expect(onSelect).toHaveBeenCalledWith(options[2]);
    expect(onClose).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Cancelar
  // -----------------------------------------------------------------------

  it("cierra modal sin seleccionar al click en Cancelar", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Deselect
  // -----------------------------------------------------------------------

  it("muestra botón de deselección cuando hay selección y allowDeselect=true", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        selectedValue={1}
        triggerLabel="Abrir"
        title="Seleccionar"
        allowDeselect
        onDeselect={onDeselect}
      />
    );

    expect(screen.getByLabelText("Deseleccionar")).toBeInTheDocument();
  });

  it("llama onDeselect al click en deseleccionar", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        selectedValue={1}
        triggerLabel="Abrir"
        title="Seleccionar"
        allowDeselect
        onDeselect={onDeselect}
      />
    );

    fireEvent.click(screen.getByLabelText("Deseleccionar"));
    expect(onDeselect).toHaveBeenCalledTimes(1);
  });

  it("NO muestra botón de deselección si allowDeselect=false", () => {
    render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        selectedValue={1}
        triggerLabel="Abrir"
        title="Seleccionar"
        allowDeselect={false}
        onDeselect={onDeselect}
      />
    );

    expect(screen.queryByLabelText("Deseleccionar")).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Search con Enter
  // -----------------------------------------------------------------------

  it("confirma selección con Enter en search input", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    // Primero seleccionar una fila
    fireEvent.click(screen.getByText("Alpha"));

    // Enter en search confirma
    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(options[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("cierra modal con Escape en search input", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Accesibilidad trigger
  // -----------------------------------------------------------------------

  it("tiene aria-haspopup y aria-expanded en trigger", () => {
    const { rerender } = render(
      <SelectModal
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    const trigger = screen.getByRole("button", { name: /abrir/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  // -----------------------------------------------------------------------
  // Contador
  // -----------------------------------------------------------------------

  it("muestra conteo de resultados filtrados vs totales", () => {
    render(
      <SelectModal
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        triggerLabel="Abrir"
        title="Seleccionar"
      />
    );

    expect(screen.getByText(/4 de 4 opciones/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Buscar...");
    fireEvent.change(searchInput, { target: { value: "Alpha" } });

    expect(screen.getByText(/1 de 4 opciones/i)).toBeInTheDocument();
    expect(screen.getByText(/filtrado/i)).toBeInTheDocument();
  });
});
