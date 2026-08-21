/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para MaterialAdderSection — cubre el flujo de checklist
 * (tildar varios materiales de una vez, confirmar en lote) y el modo
 * "Personalizado" (agregar uno a la vez, sin catálogo).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MaterialAdderSection from "@/views/InfraestructuraMantenimientoPanel/components/MaterialAdderSection";
import { ToastProvider } from "@/components/UI/Toast";

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
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
}));

vi.mock("react-dom", () => ({
  createPortal: (content: React.ReactNode) => content,
}));

const materialsCatalog = [
  { name: "Cemento", unit: "Saco", estimatedUnitPrice: 12.5 },
  { name: "Varilla 3/8", unit: "Unidad", estimatedUnitPrice: 8.2 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MaterialAdderSection", () => {
  it("muestra el banner de error cuando el submit de materiales falla (validación padre)", () => {
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[]}
          onAddedMaterialsChange={vi.fn()}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={vi.fn()}
          materialsError="Agrega al menos un material o servicio a la petición."
        />
      </ToastProvider>,
    );

    expect(screen.getByText("Agrega al menos un material o servicio a la petición.")).toBeInTheDocument();
  });

  it("abre el checklist del catálogo y confirma varios materiales de una vez (batch)", () => {
    const onAddedMaterialsChange = vi.fn();
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[]}
          onAddedMaterialsChange={onAddedMaterialsChange}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={vi.fn()}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Elegir materiales del catálogo..."));

    // Tildar ambos materiales del catálogo
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByText("Agregar 2 materiales"));

    // Un solo llamado con ambos ítems, no dos llamados separados
    expect(onAddedMaterialsChange).toHaveBeenCalledTimes(1);
    expect(onAddedMaterialsChange).toHaveBeenCalledWith([
      { name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" },
      { name: "Varilla 3/8", quantity: 1, unit: "Unidad", estimatedUnitPrice: 8.2, condition: "NUEVO" },
    ]);
  });

  it("modo Personalizado sigue agregando un material a la vez", () => {
    const onAddedMaterialsChange = vi.fn();
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[]}
          onAddedMaterialsChange={onAddedMaterialsChange}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={vi.fn()}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Personalizado"));
    fireEvent.change(screen.getByLabelText("Nombre del Material / Servicio"), {
      target: { value: "Mano de obra" },
    });
    fireEvent.click(screen.getByText("Agregar"));

    expect(onAddedMaterialsChange).toHaveBeenCalledWith([
      { name: "Mano de obra", quantity: 1, unit: "Unidad", estimatedUnitPrice: 1, condition: "NUEVO" },
    ]);
  });

  it("permite duplicados: tildar un material ya agregado crea una línea nueva", () => {
    const onAddedMaterialsChange = vi.fn();
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[{ name: "Cemento", quantity: 10, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" }]}
          onAddedMaterialsChange={onAddedMaterialsChange}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={vi.fn()}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Elegir materiales del catálogo..."));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByText("Agregar 1 material"));

    expect(onAddedMaterialsChange).toHaveBeenCalledWith([
      { name: "Cemento", quantity: 10, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" },
      { name: "Cemento", quantity: 1, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" },
    ]);
  });

  it("abre el modal de edición de detalles al hacer click en 'Editar detalles'", () => {
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[{ name: "Cemento", quantity: 10, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" }]}
          onAddedMaterialsChange={vi.fn()}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={vi.fn()}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTitle("Editar detalles"));
    expect(screen.getByText("Editar Detalles del Material")).toBeInTheDocument();
  });

  it("muestra un banner no bloqueante cuando hay materiales sin revisar", () => {
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[{ name: "Cemento", quantity: 10, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" }]}
          onAddedMaterialsChange={vi.fn()}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={vi.fn()}
        />
      </ToastProvider>,
    );

    expect(
      screen.getByText(/1 material sin revisar sus características/),
    ).toBeInTheDocument();
  });

  it("no muestra el banner cuando todos los materiales ya están revisados", () => {
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[{ name: "Cemento", quantity: 10, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" }]}
          onAddedMaterialsChange={vi.fn()}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set([0])}
          onMaterialReviewed={vi.fn()}
        />
      </ToastProvider>,
    );

    expect(screen.queryByText(/sin revisar sus características/)).not.toBeInTheDocument();
  });

  it("guardar características del modal marca el material como revisado", () => {
    const onMaterialReviewed = vi.fn();
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[{ name: "Cemento", quantity: 10, unit: "Saco", estimatedUnitPrice: 12.5, condition: "NUEVO" }]}
          onAddedMaterialsChange={vi.fn()}
          materialsSubtotal={0}
          reviewedMaterialIndexes={new Set()}
          onMaterialReviewed={onMaterialReviewed}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTitle("Editar detalles"));
    fireEvent.click(screen.getByText("Guardar"));

    expect(onMaterialReviewed).toHaveBeenCalledWith(0);
  });
});
