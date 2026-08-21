/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para MaterialCharacteristicsEditModal — condición
 * requerida (con opción "Ambas"), garantía estructurada (número + unidad,
 * válido sin garantía), y campos opcionales (marca/modelo/specs/observaciones).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MaterialCharacteristicsEditModal from "@/views/InfraestructuraMantenimientoPanel/components/MaterialCharacteristicsEditModal";

afterEach(() => vi.restoreAllMocks());

const baseMaterial = { name: "Motor", quantity: 1, unit: "Unidad", estimatedUnitPrice: 100, condition: "NUEVO" as const };

describe("MaterialCharacteristicsEditModal", () => {
  it("no permite guardar sin condición y muestra el error visual", () => {
    const onSave = vi.fn();
    render(
      <MaterialCharacteristicsEditModal
        isOpen
        material={{ ...baseMaterial, condition: undefined as unknown as "NUEVO" }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByText("Guardar"));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Selecciona la condición del material.")).toBeInTheDocument();
  });

  it("guarda con condición 'Ambas' seleccionada", () => {
    const onSave = vi.fn();
    render(
      <MaterialCharacteristicsEditModal
        isOpen
        material={{ ...baseMaterial, condition: undefined as unknown as "NUEVO" }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Ambas/ }));
    fireEvent.click(screen.getByText("Guardar"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ condition: "AMBAS", warrantyValue: undefined, warrantyUnit: undefined }),
    );
  });

  it("guarda sin garantía cuando el campo numérico queda vacío", () => {
    const onSave = vi.fn();
    render(
      <MaterialCharacteristicsEditModal isOpen material={baseMaterial} onClose={vi.fn()} onSave={onSave} />,
    );

    fireEvent.click(screen.getByText("Guardar"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ condition: "NUEVO", warrantyValue: undefined, warrantyUnit: undefined }),
    );
  });

  it("guarda garantía estructurada (número + unidad)", () => {
    const onSave = vi.fn();
    render(
      <MaterialCharacteristicsEditModal isOpen material={baseMaterial} onClose={vi.fn()} onSave={onSave} />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Meses" }));
    fireEvent.click(screen.getByText("Guardar"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ warrantyValue: 6, warrantyUnit: "MESES" }),
    );
  });

  it("marca/modelo/especificaciones/observaciones son opcionales y se envían undefined si están vacíos", () => {
    const onSave = vi.fn();
    render(
      <MaterialCharacteristicsEditModal isOpen material={baseMaterial} onClose={vi.fn()} onSave={onSave} />,
    );

    fireEvent.click(screen.getByText("Guardar"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ brand: undefined, model: undefined, specifications: undefined, observations: undefined }),
    );
  });

  it("labels indican '(Opcional)' en marca, modelo, especificaciones y observaciones", () => {
    render(
      <MaterialCharacteristicsEditModal isOpen material={baseMaterial} onClose={vi.fn()} onSave={vi.fn()} />,
    );

    expect(screen.getByLabelText("Marca (Opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Modelo (Opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Especificaciones (Opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Observaciones (Opcional)")).toBeInTheDocument();
  });
});
