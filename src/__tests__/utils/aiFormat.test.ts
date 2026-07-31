/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pruebas de formatAiCost — formateo de costos estimados de uso IA.
 */

import { describe, it, expect } from "vitest";
import { formatAiCost } from "@/utils/aiFormat";

describe("formatAiCost", () => {
  it("formatea valores normales con $ y 2 decimales", () => {
    expect(formatAiCost(4.365398)).toBe("$4.37");
    expect(formatAiCost(0.5)).toBe("$0.50");
    expect(formatAiCost(1234.567)).toBe("$1234.57");
  });

  it("muestra '< $0.01' para valores menores a un centavo", () => {
    expect(formatAiCost(0.009)).toBe("< $0.01");
    expect(formatAiCost(0.0001)).toBe("< $0.01");
  });

  it("muestra '< $0.01' para null / undefined / NaN / negativos", () => {
    expect(formatAiCost(null)).toBe("< $0.01");
    expect(formatAiCost(undefined)).toBe("< $0.01");
    expect(formatAiCost(NaN)).toBe("< $0.01");
    expect(formatAiCost(-3)).toBe("< $0.01");
  });
});
