import { describe, it, expect } from "vitest";
import { formatCurrency } from "@ivoo/shared";

describe("formatCurrency", () => {
  it("formatea monedas ISO con Intl", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50");
  });

  it("usa USD por defecto", () => {
    expect(formatCurrency(10)).toBe("$10.00");
  });

  it("no lanza con USDT (código de 4 letras) y usa su símbolo", () => {
    expect(formatCurrency(1234.5, "USDT")).toBe("₮1,234.50");
    expect(formatCurrency(-5, "USDT")).toBe("-₮5.00");
  });

  it("cae al código como prefijo para una moneda no ISO sin símbolo conocido", () => {
    expect(formatCurrency(10, "ABCD")).toBe("ABCD 10.00");
  });

  it("trunca a 2 decimales, nunca redondea, también en monedas no ISO", () => {
    expect(formatCurrency(1.999, "USDT")).toBe("₮1.99");
    expect(formatCurrency(1.999, "USD")).toBe("$1.99");
  });
});
