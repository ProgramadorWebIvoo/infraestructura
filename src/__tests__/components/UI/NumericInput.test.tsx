import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NumericInput from "@/components/UI/NumericInput";

function Controlled({ initial = "" as number | "", ...props }: { initial?: number | ""; thousands?: boolean; integer?: boolean; max?: number; decimals?: number }) {
  const [value, setValue] = useState<number | "">(initial);
  return (
    <>
      <NumericInput id="n" value={value} onChange={setValue} {...props} />
      <output data-testid="raw">{String(value)}</output>
    </>
  );
}

const input = () => screen.getByRole("textbox") as HTMLInputElement;
const raw = () => screen.getByTestId("raw").textContent;

describe("NumericInput (modo normal)", () => {
  it("sigue siendo type=number y bloquea 'e'", async () => {
    const onChange = vi.fn();
    render(<NumericInput value="" onChange={onChange} />);
    const el = screen.getByRole("spinbutton");
    await userEvent.type(el, "e");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("NumericInput thousands", () => {
  it("agrupa los miles mientras se escribe y entrega el número crudo", async () => {
    render(<Controlled thousands />);
    await userEvent.type(input(), "1250000.5");
    expect(input().value).toBe("1,250,000.5");
    expect(raw()).toBe("1250000.5");
  });

  it("conserva el punto decimal recién escrito", async () => {
    render(<Controlled thousands />);
    await userEvent.type(input(), "12.");
    expect(input().value).toBe("12.");
    expect(raw()).toBe("12");
  });

  it("limita a 2 decimales por defecto", async () => {
    render(<Controlled thousands />);
    await userEvent.type(input(), "1.2345");
    expect(input().value).toBe("1.23");
  });

  it("acepta pegar un monto con comas", async () => {
    render(<Controlled thousands />);
    await userEvent.click(input());
    await userEvent.paste("1,234,567.89");
    expect(input().value).toBe("1,234,567.89");
    expect(raw()).toBe("1234567.89");
  });

  it("muestra el valor inicial formateado", () => {
    render(<Controlled thousands initial={9876543.21} />);
    expect(input().value).toBe("9,876,543.21");
  });

  it("vaciar el campo devuelve ''", async () => {
    render(<Controlled thousands initial={1500} />);
    await userEvent.clear(input());
    expect(raw()).toBe("");
  });

  it("bloquea letras y signo negativo", async () => {
    render(<Controlled thousands />);
    await userEvent.type(input(), "-1ab2e3");
    expect(input().value).toBe("123");
    expect(raw()).toBe("123");
  });

  it("clampa al máximo", async () => {
    render(<Controlled thousands max={1000} />);
    await userEvent.type(input(), "5000");
    expect(input().value).toBe("1,000");
    expect(raw()).toBe("1000");
  });

  it("en modo entero ignora el punto", async () => {
    render(<Controlled thousands integer />);
    await userEvent.type(input(), "1234.5");
    expect(input().value).toBe("12,345");
  });

  it("al salir del campo quita el punto sobrante", async () => {
    render(<Controlled thousands />);
    await userEvent.type(input(), "1500.");
    await userEvent.tab();
    expect(input().value).toBe("1,500");
  });
});
