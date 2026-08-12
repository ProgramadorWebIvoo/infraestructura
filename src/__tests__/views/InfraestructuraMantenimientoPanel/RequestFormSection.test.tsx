/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas unitarias para RequestFormSection — verifica la accesibilidad de
 * labels (htmlFor/id), los errores inline con foco al primer campo inválido,
 * el toggle de tipo como radiogroup y el envío del formulario.
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
    onSubmit: vi.fn(),
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

  it("envía el formulario al pulsar el botón principal", () => {
    const onSubmit = vi.fn();
    render(<RequestFormSection {...baseProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar Petición a Cierre de Obra" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
