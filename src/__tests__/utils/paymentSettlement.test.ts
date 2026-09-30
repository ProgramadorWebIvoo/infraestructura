import { describe, it, expect } from "vitest";
import {
  coveredAmount,
  differenceAmount,
  exceedsTolerance,
  formatPaidAmount,
  suggestedRate,
} from "@/utils/paymentSettlement";

const RATES = { USD: 800, EUR: 900, USDT: 1000 };

describe("suggestedRate", () => {
  it("es 1 cuando se paga en la misma moneda de la obligación", () => {
    expect(suggestedRate(RATES, "USDT", "USDT", null)).toBe(1);
  });

  it("en bolívares usa la tasa de la moneda de la obligación", () => {
    expect(suggestedRate(RATES, "USDT", "VES", "BCV")).toBe(1000);
    expect(suggestedRate(RATES, "EUR", "VES", "BCV")).toBe(900);
    expect(suggestedRate(RATES, "USD", "VES", "BCV")).toBe(800);
  });

  it("una obligación en USD pagada en bolívares con origen USDT usa la tasa USDT", () => {
    expect(suggestedRate(RATES, "USD", "VES", "USDT")).toBe(1000);
  });

  it("entre dos monedas hace el cruce por el bolívar", () => {
    // 1 USDT = 1000/800 = 1,25 USD
    expect(suggestedRate(RATES, "USDT", "USD", "MANUAL")).toBe(1.25);
  });

  it("devuelve null si falta alguna tasa o no hay moneda", () => {
    expect(suggestedRate({}, "USDT", "VES", "BCV")).toBeNull();
    expect(suggestedRate(RATES, "USDT", "GBP", "MANUAL")).toBeNull();
    expect(suggestedRate(RATES, "USDT", "", "BCV")).toBeNull();
  });
});

describe("cobertura y diferencia", () => {
  it("el equivalente cubierto es lo pagado entre la tasa, a 2 decimales", () => {
    expect(coveredAmount(345600, 960)).toBe(360);
    expect(coveredAmount(340000, 960)).toBe(354.17);
    expect(coveredAmount(100, 0)).toBe(0);
  });

  it("la diferencia es positiva si se pagó de más y respeta la tolerancia de 0,01", () => {
    expect(differenceAmount(354.17, 360)).toBe(-5.83);
    expect(differenceAmount(360.5, 360)).toBe(0.5);
    expect(exceedsTolerance(0.01)).toBe(false);
    expect(exceedsTolerance(-0.02)).toBe(true);
  });
});

describe("formatPaidAmount", () => {
  it("muestra los bolívares con formato es-VE", () => {
    expect(formatPaidAmount(1234.5, "VES")).toBe("Bs. 1.234,50");
  });

  it("muestra USDT y monedas ISO con su símbolo y código", () => {
    expect(formatPaidAmount(360, "USDT")).toBe("₮360.00 USDT");
    expect(formatPaidAmount(1200, "EUR")).toBe("€1,200.00 EUR");
  });
});
