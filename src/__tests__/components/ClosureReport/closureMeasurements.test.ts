import { describe, expect, it } from "vitest";
import {
  countDifferences,
  initialDrafts,
  measurementErrors,
  toMeasurementPayload,
  validateMeasurement,
} from "@/components/ClosureReport/closureMeasurements";
import type { ClosureReportItem } from "@/components/ClosureReport/types";

const item = (over: Partial<ClosureReportItem> = {}): ClosureReportItem => ({
  id: 1, name: "Cable", unit: "m", contractedQuantity: 100, executedQuantity: 90, unitPriceUsd: 2, note: "Ajuste", ...over,
});

describe("closureMeasurements", () => {
  it("arranca vacío: el informe del residente es independiente del proveedor", () => {
    expect(initialDrafts([item()])[1]).toEqual({ quantity: "", note: "" });
  });

  it("conserva la medición previa del residente", () => {
    expect(initialDrafts([item({ residentQuantity: 80, residentNote: "Medido" })])[1]).toEqual({ quantity: "80", note: "Medido" });
  });

  it("no permite cantidad vacía ni negativa", () => {
    expect(validateMeasurement(item(), { quantity: "", note: "" })).toMatch(/Registre/);
    expect(validateMeasurement(item(), { quantity: "-1", note: "x" })).toMatch(/negativa/);
    expect(validateMeasurement(item(), { quantity: "101", note: "x" })).toBeNull();
  });

  it("exige nota solo cuando difiere de lo contratado (aumento o disminución)", () => {
    expect(validateMeasurement(item(), { quantity: "100", note: "" })).toBeNull();
    expect(validateMeasurement(item(), { quantity: "80", note: "" })).toMatch(/contratado/);
    expect(validateMeasurement(item(), { quantity: "120", note: "" })).toMatch(/contratado/);
    expect(validateMeasurement(item(), { quantity: "80", note: "Faltan 10" })).toBeNull();
  });

  it("acepta coma decimal", () => {
    expect(validateMeasurement(item({ contractedQuantity: 90.5 }), { quantity: "90,5", note: "" })).toBeNull();
  });

  it("agrega errores por partida y cuenta diferencias", () => {
    const items = [item({ id: 1 }), item({ id: 2, name: "Tomacorriente", contractedQuantity: 12, executedQuantity: 12 })];
    const drafts = { 1: { quantity: "80", note: "" }, 2: { quantity: "12", note: "" } };
    expect(Object.keys(measurementErrors(items, drafts))).toEqual(["1"]);
    expect(countDifferences(items, drafts)).toBe(1);
  });

  it("arma el payload de cada etapa", () => {
    const drafts = { 1: { quantity: "85", note: " Medido " } };
    expect(toMeasurementPayload([item()], drafts)).toEqual([{ id: 1, residentQuantity: 85, note: "Medido" }]);
  });
});
