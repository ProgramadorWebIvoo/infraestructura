import { describe, expect, it } from "vitest";
import { lineError } from "@/views/InfraestructuraMantenimientoPanel/components/modificationUtils";

describe("lineError", () => {
  it("exige partida y cantidad positiva", () => {
    expect(lineError({ materialId: "", type: "AUMENTO", quantity: 1 }, undefined)).toMatch(/partida/);
    expect(lineError({ materialId: "M1", type: "AUMENTO", quantity: "" }, 5)).toMatch(/cantidad/);
    expect(lineError({ materialId: "M1", type: "AUMENTO", quantity: 0 }, 5)).toMatch(/cantidad/);
  });

  it("impide disminuir más de la cantidad vigente (nunca < 0)", () => {
    expect(lineError({ materialId: "M1", type: "DISMINUCION", quantity: 6 }, 5)).toMatch(/No puede disminuir/);
    expect(lineError({ materialId: "M1", type: "DISMINUCION", quantity: 5 }, 5)).toBeNull();
  });

  it("los aumentos no dependen de la cantidad vigente", () => {
    expect(lineError({ materialId: "M1", type: "AUMENTO", quantity: 100 }, 5)).toBeNull();
  });
});
