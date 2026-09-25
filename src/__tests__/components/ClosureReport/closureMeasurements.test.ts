import { describe, expect, it } from "vitest";
import {
  countDifferences,
  initialDrafts,
  measurementErrors,
  previewFiniquito,
  toMeasurementPayload,
  validateMeasurement,
} from "@/components/ClosureReport/closureMeasurements";
import type { ClosureReportItem } from "@/components/ClosureReport/types";

const item = (over: Partial<ClosureReportItem> = {}): ClosureReportItem => ({
  id: 1, name: "Cable", unit: "m", contractedQuantity: 100, executedQuantity: 90, unitPriceUsd: 2, note: "Ajuste", ...over,
});

describe("closureMeasurements", () => {
  it("prellena al residente con lo declarado por el contratista", () => {
    expect(initialDrafts([item()])[1]).toEqual({ quantity: "90", note: "" });
  });

  it("conserva la medición previa del residente", () => {
    expect(initialDrafts([item({ residentQuantity: 80, residentNote: "Medido" })])[1]).toEqual({ quantity: "80", note: "Medido" });
  });

  it("no permite cantidad vacía, negativa ni mayor a lo contratado", () => {
    expect(validateMeasurement(item(), { quantity: "", note: "" })).toMatch(/Registre/);
    expect(validateMeasurement(item(), { quantity: "-1", note: "x" })).toMatch(/negativa/);
    expect(validateMeasurement(item(), { quantity: "101", note: "x" })).toMatch(/contratado/);
  });

  it("exige nota solo cuando difiere de la cantidad declarada por el contratista", () => {
    expect(validateMeasurement(item(), { quantity: "90", note: "" })).toBeNull();
    expect(validateMeasurement(item(), { quantity: "80", note: "" })).toMatch(/contratista/);
    expect(validateMeasurement(item(), { quantity: "80", note: "Faltan 10" })).toBeNull();
  });

  it("acepta coma decimal", () => {
    expect(validateMeasurement(item({ executedQuantity: 90.5 }), { quantity: "90,5", note: "" })).toBeNull();
  });

  it("agrega errores por partida y cuenta diferencias", () => {
    const items = [item({ id: 1 }), item({ id: 2, name: "Tomacorriente", contractedQuantity: 12, executedQuantity: 12 })];
    const drafts = { 1: { quantity: "80", note: "" }, 2: { quantity: "12", note: "" } };
    expect(Object.keys(measurementErrors(items, drafts))).toEqual(["1"]);
    expect(countDifferences(items, drafts)).toBe(1);
  });

  it("calcula la vista previa del finiquito con la medición del residente", () => {
    const items = [item({ id: 1, contractedQuantity: 100 }), item({ id: 2, contractedQuantity: 12, unitPriceUsd: 50 })];
    items[0].residentQuantity = 100;
    items[1].residentQuantity = 8;
    // 10000 − 3000 − (12−8)×50 = 6800
    expect(previewFiniquito({ contractedTotal: 10000, advancePaid: 3000, items })).toBe(6800);
    expect(previewFiniquito({ contractedTotal: null, advancePaid: 0, items })).toBeNull();
    expect(previewFiniquito({ contractedTotal: 100, advancePaid: 500, items })).toBe(0);
  });

  it("arma el payload de cada etapa", () => {
    const drafts = { 1: { quantity: "85", note: " Medido " } };
    expect(toMeasurementPayload([item()], drafts)).toEqual([{ id: 1, residentQuantity: 85, note: "Medido" }]);
  });
});
