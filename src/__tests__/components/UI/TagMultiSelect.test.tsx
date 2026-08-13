import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TagMultiSelect, { type TagOption } from "@/components/UI/TagMultiSelect";

const options: TagOption[] = [
  { value: "Rechazo de cuadro comparativo", label: "Rechazo de cuadro comparativo" },
  { value: "Confirmacion de contratacion", label: "Confirmacion de contratacion" },
  { value: "Liberacion de anticipo", label: "Liberacion de anticipo" },
];
const values = options.map(o => o.value);

describe("TagMultiSelect", () => {
  it("renderiza cada opción como chip usando su label", () => {
    render(<TagMultiSelect options={options} value={[]} onChange={() => {}} />);

    for (const option of options) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it("marca como seleccionados los chips cuyo value está presente en value", () => {
    render(<TagMultiSelect options={options} value={[values[0]]} onChange={() => {}} />);

    expect(screen.getByText(options[0].label)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(options[1].label)).toHaveAttribute("aria-pressed", "false");
  });

  it("click en un chip no seleccionado lo agrega a value (por su value técnico)", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[values[0]]} onChange={onChange} />);

    fireEvent.click(screen.getByText(options[1].label));

    expect(onChange).toHaveBeenCalledWith([values[0], values[1]]);
  });

  it("click en un chip seleccionado lo remueve de value", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[values[0], values[1]]} onChange={onChange} />);

    fireEvent.click(screen.getByText(options[0].label));

    expect(onChange).toHaveBeenCalledWith([values[1]]);
  });

  it("'Seleccionar todas' pasa los values de todas las opciones", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByText("Seleccionar todas"));

    expect(onChange).toHaveBeenCalledWith(values);
  });

  it("'Ninguna' vacía la selección", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={values} onChange={onChange} />);

    fireEvent.click(screen.getByText("Ninguna"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("muestra el conteo de seleccionadas / total", () => {
    render(<TagMultiSelect options={options} value={[values[0]]} onChange={() => {}} />);

    expect(screen.getByText("1 de 3 seleccionadas")).toBeInTheDocument();
  });

  it("cuando disabled=true, no dispara onChange al clickear", () => {
    const onChange = vi.fn();
    render(<TagMultiSelect options={options} value={[]} onChange={onChange} disabled />);

    fireEvent.click(screen.getByText(options[0].label));
    fireEvent.click(screen.getByText("Seleccionar todas"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("muestra el label legible en vez del value técnico cuando difieren", () => {
    const technicalOptions: TagOption[] = [{ value: "contractor.register", label: "Registro público de proveedor" }];

    render(<TagMultiSelect options={technicalOptions} value={[]} onChange={() => {}} />);

    expect(screen.getByText("Registro público de proveedor")).toBeInTheDocument();
    expect(screen.queryByText("contractor.register")).not.toBeInTheDocument();
  });
});
