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
    locationMode: "custom" as const,
    onLocationModeChange: vi.fn(),
    selectedLocalization: null,
    onLocalizationSelect: vi.fn(),
    localizations: [],
    type: "INFRAESTRUCTURA",
    onTypeChange: vi.fn(),
    typeOptions: [
      { key: "INFRAESTRUCTURA", label: "Obras / Infraestructura" },
      { key: "MANTENIMIENTO", label: "Mantenimiento" },
    ],
    description: "",
    onDescriptionChange: vi.fn(),
  };

  it("asocia los labels con los campos mediante htmlFor/id", () => {
    render(<RequestFormSection {...baseProps} />);

    expect(screen.getByLabelText("Título de la Obra")).toBeInTheDocument();
    expect(screen.getByLabelText("Ubicación personalizada")).toBeInTheDocument();
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

  it("en modo Registradas muestra el botón del catálogo y la tarjeta con el residente heredado", () => {
    const { rerender } = render(<RequestFormSection {...baseProps} locationMode="registered" />);
    expect(screen.getByRole("button", { name: /Elegir ubicación registrada/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Ubicación personalizada")).not.toBeInTheDocument();

    rerender(
      <RequestFormSection
        {...baseProps}
        locationMode="registered"
        selectedLocalization={{ id: 1, label: "Tienda Sur — Valencia", residentName: "Rita" }}
      />,
    );
    expect(screen.getByText("Tienda Sur — Valencia")).toBeInTheDocument();
    expect(screen.getByText(/Residente: Rita/)).toBeInTheDocument();
  });

  it("ya no ofrece selector de residente en el formulario", () => {
    render(<RequestFormSection {...baseProps} />);
    expect(screen.queryByLabelText(/residente/i)).not.toBeInTheDocument();
  });

  it("cambia de pestaña entre Registradas y Personalizada", () => {
    const onLocationModeChange = vi.fn();
    render(<RequestFormSection {...baseProps} onLocationModeChange={onLocationModeChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Registradas" }));
    expect(onLocationModeChange).toHaveBeenCalledWith("registered");
  });
});
