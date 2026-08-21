/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para MaterialChecklistModal — el checklist de materiales
 * que reemplazó el flujo "elegir uno → cantidad → Agregar → repetir".
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MaterialChecklistModal from "@/views/InfraestructuraMantenimientoPanel/components/MaterialChecklistModal";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
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

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

const materialsCatalog = [
  { name: "Cemento", unit: "Saco", estimatedUnitPrice: 12.5 },
  { name: "Varilla 3/8", unit: "Unidad", estimatedUnitPrice: 8.2 },
  { name: "Arena", unit: "m³", estimatedUnitPrice: 30 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MaterialChecklistModal", () => {
  it("tildar varios materiales habilita cantidad por fila con default 1", () => {
    render(
      <MaterialChecklistModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} materialsCatalog={materialsCatalog} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const qtyInputs = screen.getAllByRole("spinbutton");
    expect(qtyInputs).toHaveLength(2);
    expect((qtyInputs[0] as HTMLInputElement).value).toBe("1");
  });

  it("destildar un material lo saca del contador del botón de confirmar", () => {
    render(
      <MaterialChecklistModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} materialsCatalog={materialsCatalog} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText("Agregar 2 materiales")).toBeInTheDocument();

    fireEvent.click(checkboxes[0]);
    expect(screen.getByText("Agregar 1 material")).toBeInTheDocument();
  });

  it("cantidad inválida en fila tildada deshabilita el botón de confirmar", () => {
    render(
      <MaterialChecklistModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} materialsCatalog={materialsCatalog} />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    const qtyInput = screen.getByRole("spinbutton");
    fireEvent.change(qtyInput, { target: { value: "0" } });

    const confirmButton = screen.getByText("Agregar 1 material").closest("button");
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText("Cantidad requerida")).toBeInTheDocument();
  });

  it("confirma con selección válida: onConfirm se llama una vez con el array completo, y cierra", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <MaterialChecklistModal isOpen onClose={onClose} onConfirm={onConfirm} materialsCatalog={materialsCatalog} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Cemento (index 0)
    fireEvent.click(checkboxes[2]); // Arena (index 2)

    const qtyInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(qtyInputs[1], { target: { value: "5" } });

    fireEvent.click(screen.getByText("Agregar 2 materiales"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith([
      { catalogIndex: 0, quantity: 1 },
      { catalogIndex: 2, quantity: 5 },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("click en el input de cantidad no destilda la fila (propagación al onRowClick de la Table)", () => {
    render(
      <MaterialChecklistModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} materialsCatalog={materialsCatalog} />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("Agregar 1 material")).toBeInTheDocument();

    const qtyInput = screen.getByRole("spinbutton");
    fireEvent.click(qtyInput);
    fireEvent.change(qtyInput, { target: { value: "3" } });

    expect(screen.getByText("Agregar 1 material")).toBeInTheDocument();
    expect((qtyInput as HTMLInputElement).value).toBe("3");
  });

  it("reabrir tras cerrar sin confirmar resetea la selección", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MaterialChecklistModal isOpen onClose={onClose} onConfirm={vi.fn()} materialsCatalog={materialsCatalog} />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("Agregar 1 material")).toBeInTheDocument();

    // Cerrar (llama onClose real vía handleClose interno, que resetea el estado)
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <MaterialChecklistModal isOpen onClose={onClose} onConfirm={vi.fn()} materialsCatalog={materialsCatalog} />,
    );

    expect(screen.getByText("Agregar materiales")).toBeInTheDocument();
  });
});
