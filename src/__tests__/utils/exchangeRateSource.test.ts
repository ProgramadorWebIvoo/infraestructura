import { describe, it, expect } from "vitest";
import { exchangeRateSourceLabel, isUsdtSource } from "@/utils/exchangeRateSource";

describe("exchangeRateSourceLabel", () => {
  it("etiqueta las fuentes BCV conocidas", () => {
    expect(exchangeRateSourceLabel("DOLARVZLA_API")).toBe("DolarVZLA API");
    expect(exchangeRateSourceLabel("BCV_SCRAPING")).toBe("BCV Scraping");
  });

  it("etiqueta la fuente USDT con su mercado", () => {
    expect(exchangeRateSourceLabel("USDT_COM_VE:binance")).toBe("usdt.com.ve (Binance)");
    expect(exchangeRateSourceLabel("USDT_COM_VE")).toBe("usdt.com.ve");
  });

  it("devuelve la fuente tal cual si no la conoce y guion si no hay", () => {
    expect(exchangeRateSourceLabel("manual")).toBe("manual");
    expect(exchangeRateSourceLabel(null)).toBe("-");
  });

  it("isUsdtSource distingue las filas USDT", () => {
    expect(isUsdtSource("USDT_COM_VE:bybit")).toBe(true);
    expect(isUsdtSource("DOLARVZLA_API")).toBe(false);
    expect(isUsdtSource(undefined)).toBe(false);
  });
});
