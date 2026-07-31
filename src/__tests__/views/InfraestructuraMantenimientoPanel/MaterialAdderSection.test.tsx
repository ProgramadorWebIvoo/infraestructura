/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para MaterialAdderSection — verifica que el modal de
 * selección de material del catálogo muestre columnas con información real
 * (Nombre/Unidad/Precio) en vez de la columna "Valor" genérica de
 * SelectModal, que exponía el índice interno del array.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MaterialAdderSection from "@/views/InfraestructuraMantenimientoPanel/MaterialAdderSection";
import { ToastProvider } from "@/components/UI/Toast";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, variants, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
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

describe("MaterialAdderSection — modal de catálogo", () => {
  it("muestra columnas Nombre/Unidad/Precio Unit., no 'Valor' con índice crudo", () => {
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[]}
          onAddedMaterialsChange={vi.fn()}
        />
      </ToastProvider>,
    );

    // selectedCatalogIndex arranca en 0: el botón trigger ya muestra el
    // primer material seleccionado ("Cemento") en vez del placeholder.
    fireEvent.click(screen.getByText("Cemento"));

    // "Precio Unit. (Est)" también es el header de la tabla de agregados
    // (vacía en este test), por eso se valida con getAllByText.
    expect(screen.getAllByText("Precio Unit. (Est)").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Unidad" })).toBeInTheDocument();
    expect(screen.queryByText("Valor")).not.toBeInTheDocument();

    // Precio real del catálogo visible, no el índice (0/1) que mostraba antes
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("$8.20")).toBeInTheDocument();
  });

  it("muestra el banner de error cuando el submit de materiales falla (validación padre)", () => {
    render(
      <ToastProvider>
        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={[]}
          onAddedMaterialsChange={vi.fn()}
          materialsError="Agrega al menos un material o servicio a la petición."
        />
      </ToastProvider>,
    );

    expect(screen.getByText("Agrega al menos un material o servicio a la petición.")).toBeInTheDocument();
  });
});
