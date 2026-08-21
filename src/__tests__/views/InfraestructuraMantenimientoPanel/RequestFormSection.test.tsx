/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para RequestFormSection — paso 1 del wizard (contenido
 * puro de campos, sin Card/form/submit propios, esos viven en
 * RequestWizardCard). Verifica accesibilidad de labels (htmlFor/id), errores
 * inline con foco al primer campo inválido y el toggle de tipo como radiogroup.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RequestFormSection from "@/views/InfraestructuraMantenimientoPanel/components/RequestFormSection";

describe("RequestFormSection", () => {
  const baseProps = {
    title: "",
    onTitleChange: vi.fn(),
    location: "",
    onLocationChange: vi.fn(),
    type: "INFRAESTRUCTURA" as const,
    onTypeChange: vi.fn(),
    description: "",
    onDescriptionChange: vi.fn(),
  };

  it("asocia los labels con los campos mediante htmlFor/id", () => {
    render(<RequestFormSection {...baseProps} />);

    expect(screen.getByLabelText("Título de la Obra")).toBeInTheDocument();
    expect(screen.getByLabelText("Ubicación / Tienda / CD")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción del Trabajo")).toBeInTheDocument();
  });

  it("muestra errores inline y enfoca el primer campo inválido", () => {
    render(
      <RequestFormSection
        {...baseProps}
        errors={{
          title: "El título de la obra o trabajo es obligatorio.",
          location: "La ubicación exacta es obligatoria.",
        }}
      />,
    );

    expect(screen.getByText("El título de la obra o trabajo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("La ubicación exacta es obligatoria.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título de la Obra")).toHaveFocus();
    expect(screen.getByLabelText("Título de la Obra")).toHaveAttribute("aria-invalid", "true");
  });

  it("expone el toggle de tipo como radiogroup y cambia a Mantenimiento", () => {
    const onTypeChange = vi.fn();
    render(<RequestFormSection {...baseProps} onTypeChange={onTypeChange} />);

    const mantRadio = screen.getByRole("radio", { name: /Mantenimiento/ });
    expect(screen.getByRole("radiogroup", { name: "Tipo de requerimiento" })).toBeInTheDocument();
    fireEvent.click(mantRadio);
    expect(onTypeChange).toHaveBeenCalledWith("MANTENIMIENTO");
  });
});
