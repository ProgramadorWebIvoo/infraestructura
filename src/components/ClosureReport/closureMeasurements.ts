import type { ClosureReportItem } from "./types";

/** Borrador editable de una partida (cantidad como texto para admitir el campo vacío). */
export interface MeasurementDraft {
  quantity: string;
  note: string;
}

export type MeasurementDrafts = Record<number, MeasurementDraft>;

/** Etapa que mide: el residente parte de lo declarado por el contratista; Auditoría, de lo medido por el residente. */
export type MeasurementStage = "resident" | "audit";

/** Cantidad contra la que se compara la medición de cada etapa. */
export function baselineQuantity(item: ClosureReportItem, stage: MeasurementStage): number {
  return stage === "resident" ? item.executedQuantity : (item.residentQuantity ?? item.executedQuantity);
}

/** Valor inicial del borrador: lo que ya midió esa etapa (p. ej. tras una devolución) o la cantidad base. */
export function initialDrafts(items: ClosureReportItem[], stage: MeasurementStage): MeasurementDrafts {
  return Object.fromEntries(
    items.map((item) => {
      const own = stage === "resident" ? item.residentQuantity : item.auditQuantity;
      const note = (stage === "resident" ? item.residentNote : item.auditNote) ?? "";
      return [item.id, { quantity: String(own ?? baselineQuantity(item, stage)), note }];
    }),
  );
}

export function parseQuantity(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Diferencia contra la cantidad base de la etapa (con tolerancia de redondeo). */
export function differsFromBaseline(item: ClosureReportItem, draft: MeasurementDraft, stage: MeasurementStage): boolean {
  const quantity = parseQuantity(draft.quantity);
  return quantity !== null && Math.abs(quantity - baselineQuantity(item, stage)) > 0.001;
}

/** Mensaje de error de una partida medida, o null si es válida. */
export function validateMeasurement(item: ClosureReportItem, draft: MeasurementDraft, stage: MeasurementStage): string | null {
  const quantity = parseQuantity(draft.quantity);
  if (quantity === null) return "Registre la cantidad verificada.";
  if (quantity < 0) return "No puede ser negativa.";
  if (quantity > item.contractedQuantity) return `No puede superar lo contratado (${item.contractedQuantity}).`;
  if (differsFromBaseline(item, draft, stage) && !draft.note.trim()) {
    return stage === "resident" ? "Justifique la diferencia con lo declarado por el contratista." : "Justifique la diferencia con la medición del residente.";
  }
  return null;
}

export function measurementErrors(items: ClosureReportItem[], drafts: MeasurementDrafts, stage: MeasurementStage): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const item of items) {
    const error = validateMeasurement(item, drafts[item.id] ?? { quantity: "", note: "" }, stage);
    if (error) errors[item.id] = error;
  }
  return errors;
}

export function countDifferences(items: ClosureReportItem[], drafts: MeasurementDrafts, stage: MeasurementStage): number {
  return items.filter((item) => drafts[item.id] && differsFromBaseline(item, drafts[item.id], stage)).length;
}

/** Discrepancia entre dos mediciones ya registradas (vista de solo lectura). */
export function differs(a: number | null | undefined, b: number | null | undefined): boolean {
  return a != null && b != null && Math.abs(a - b) > 0.001;
}

interface FiniquitoPreviewInput {
  contractedTotal: number | null | undefined;
  advancePaid: number | null | undefined;
  items: ClosureReportItem[];
  drafts: MeasurementDrafts;
}

/**
 * Vista previa del finiquito: contratado − anticipo − Σ(contratado − final) × precio unitario.
 * Solo orientativa — el monto oficial lo calcula y devuelve el backend al verificar.
 */
export function previewFiniquito({ contractedTotal, advancePaid, items, drafts }: FiniquitoPreviewInput): number | null {
  if (contractedTotal == null) return null;
  const reductions = items.reduce((sum, item) => {
    const final = parseQuantity(drafts[item.id]?.quantity ?? "") ?? item.contractedQuantity;
    return sum + Math.max(0, item.contractedQuantity - final) * (item.unitPriceUsd ?? 0);
  }, 0);
  return Math.round(Math.max(0, contractedTotal - (advancePaid ?? 0) - reductions) * 100) / 100;
}

export interface ResidentMeasurement {
  id: number;
  residentQuantity: number;
  note?: string;
}

export interface AuditMeasurement {
  id: number;
  auditQuantity: number;
  note?: string;
}

/** Payload de resident-approval / audit-approval a partir de los borradores (ya validados). */
export function toMeasurementPayload(items: ClosureReportItem[], drafts: MeasurementDrafts, stage: "resident"): ResidentMeasurement[];
export function toMeasurementPayload(items: ClosureReportItem[], drafts: MeasurementDrafts, stage: "audit"): AuditMeasurement[];
export function toMeasurementPayload(items: ClosureReportItem[], drafts: MeasurementDrafts, stage: MeasurementStage): ResidentMeasurement[] | AuditMeasurement[] {
  return items.map((item) => {
    const draft = drafts[item.id];
    const quantity = parseQuantity(draft.quantity) as number;
    const note = draft.note.trim() || undefined;
    return stage === "resident" ? { id: item.id, residentQuantity: quantity, note } : { id: item.id, auditQuantity: quantity, note };
  }) as ResidentMeasurement[] | AuditMeasurement[];
}
