import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TagMultiSelect from "@/components/UI/TagMultiSelect";

const options = ["Rechazo de cuadro comparativo", "Confirmacion de contratacion", "Liberacion de anticipo"];

describe("TagMultiSelect", () => {
  it("renderiza cada opción como chip", () => {
    render(<TagMultiSelect options={options} value={[]} onChange={() => {}} />);

    for (const option of options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
  });

  it("marca como seleccionados los chips presentes en value", () => {
    render(<TagMultiSelect options={options} value={[options[0]]} onChange={() => {}} />);

    expect(screen.getByText(options[0])).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(options[1])).toHaveAttribute("aria-pressed", "false");
  });

  it("click en un chip no seleccionado lo agrega a value", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[options[0]]} onChange={onChange} />);

    fireEvent.click(screen.getByText(options[1]));

    expect(onChange).toHaveBeenCalledWith([options[0], options[1]]);
  });

  it("click en un chip seleccionado lo remueve de value", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[options[0], options[1]]} onChange={onChange} />);

    fireEvent.click(screen.getByText(options[0]));

    expect(onChange).toHaveBeenCalledWith([options[1]]);
  });

  it("'Seleccionar todas' pasa la lista completa de opciones", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByText("Seleccionar todas"));

    expect(onChange).toHaveBeenCalledWith(options);
  });

  it("'Ninguna' vacía la selección", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={options} onChange={onChange} />);

    fireEvent.click(screen.getByText("Ninguna"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("muestra el conteo de seleccionadas / total", () => {
    render(<TagMultiSelect options={options} value={[options[0]]} onChange={() => {}} />);

    expect(screen.getByText("1 de 3 seleccionadas")).toBeInTheDocument();
  });

  it("cuando disabled=true, no dispara onChange al clickear", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[]} onChange={onChange} disabled />);

    fireEvent.click(screen.getByText(options[0]));
    fireEvent.click(screen.getByText("Seleccionar todas"));

    expect(onChange).not.toHaveBeenCalled();
  });
});
