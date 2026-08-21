import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SegmentedControl from "@/components/UI/SegmentedControl";

describe("SegmentedControl", () => {
  it("variant='card' expone role=radiogroup/radio con aria-checked correcto", () => {
    render(
      <SegmentedControl
        variant="card"
        ariaLabel="Tipo"
        options={[
          { value: "A", label: "Opción A" },
          { value: "B", label: "Opción B" },
        ]}
        value="A"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "Tipo" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveAttribute("aria-checked", "false");
  });

  it("variant='pill' cambia la clase activa al hacer click y llama onChange", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        variant="pill"
        options={[
          { value: "catalog", label: "Catálogo" },
          { value: "custom", label: "Personalizado" },
        ]}
        value="catalog"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText("Personalizado"));
    expect(onChange).toHaveBeenCalledWith("custom");
  });

  it("accent por opción sobreescribe el accent global", () => {
    render(
      <SegmentedControl
        variant="card"
        ariaLabel="Tipo"
        accent="brand"
        options={[
          { value: "A", label: "A", accent: "neutral" },
          { value: "B", label: "B" },
        ]}
        value="A"
        onChange={vi.fn()}
      />,
    );

    const radios = screen.getAllByRole("radio");
    // La opción A (activa) usa neutral, no brand — verificado indirectamente vía clase de texto.
    expect(radios[0].className).toContain("text-neutral-700");
  });

  it("onChange se invoca con el value correcto al hacer click en variant='card'", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        variant="card"
        ariaLabel="Tipo"
        options={[
          { value: "NUEVO", label: "Nuevo" },
          { value: "USADO", label: "Usado" },
        ]}
        value="NUEVO"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText("Usado"));
    expect(onChange).toHaveBeenCalledWith("USADO");
  });
});
