import type { ClosureReportItem } from "./types";

/** Borrador editable de una partida (cantidad como texto para admitir el campo vacío). */
export interface MeasurementDraft {
  quantity: string;
  note: string;
}

export type MeasurementDrafts = Record<number, MeasurementDraft>;

/** Cantidad contra la que se compara la medición del residente: lo declarado por el contratista. */
export function baselineQuantity(item: ClosureReportItem): number {
  return item.executedQuantity;
}

/** Valor inicial del borrador: lo que ya midió esa etapa (p. ej. tras una devolución) o la cantidad base. */
export function initialDrafts(items: ClosureReportItem[]): MeasurementDrafts {
  return Object.fromEntries(
    items.map((item) => {
      return [item.id, { quantity: String(item.residentQuantity ?? baselineQuantity(item)), note: item.residentNote ?? "" }];
    }),
  );
}

export function parseQuantity(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Diferencia contra la cantidad base de la etapa (con tolerancia de redondeo). */
export function differsFromBaseline(item: ClosureReportItem, draft: MeasurementDraft): boolean {
  const quantity = parseQuantity(draft.quantity);
  return quantity !== null && Math.abs(quantity - baselineQuantity(item)) > 0.001;
}

/** Mensaje de error de una partida medida, o null si es válida. */
export function validateMeasurement(item: ClosureReportItem, draft: MeasurementDraft): string | null {
  const quantity = parseQuantity(draft.quantity);
  if (quantity === null) return "Registre la cantidad verificada.";
  if (quantity < 0) return "No puede ser negativa.";
  if (quantity > item.contractedQuantity) return `No puede superar lo contratado (${item.contractedQuantity}).`;
  if (differsFromBaseline(item, draft) && !draft.note.trim()) return "Justifique la diferencia con lo declarado por el contratista.";
  return null;
}

export function measurementErrors(items: ClosureReportItem[], drafts: MeasurementDrafts): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const item of items) {
    const error = validateMeasurement(item, drafts[item.id] ?? { quantity: "", note: "" });
    if (error) errors[item.id] = error;
  }
  return errors;
}

export function countDifferences(items: ClosureReportItem[], drafts: MeasurementDrafts): number {
  return items.filter((item) => drafts[item.id] && differsFromBaseline(item, drafts[item.id])).length;
}

/** Discrepancia entre dos mediciones ya registradas (vista de solo lectura). */
export function differs(a: number | null | undefined, b: number | null | undefined): boolean {
  return a != null && b != null && Math.abs(a - b) > 0.001;
}

interface FiniquitoPreviewInput {
  contractedTotal: number | null | undefined;
  advancePaid: number | null | undefined;
  items: ClosureReportItem[];
}

/**
 * Vista previa del finiquito: contratado − anticipo − Σ(contratado − final) × precio unitario,
 * donde la cantidad final es la medición del residente. Solo orientativa — el monto oficial
 * lo calcula y devuelve el backend al verificar.
 */
export function previewFiniquito({ contractedTotal, advancePaid, items }: FiniquitoPreviewInput): number | null {
  if (contractedTotal == null) return null;
  const reductions = items.reduce((sum, item) => {
    const final = item.finalQuantity ?? item.residentQuantity ?? item.executedQuantity;
    return sum + Math.max(0, item.contractedQuantity - final) * (item.unitPriceUsd ?? 0);
  }, 0);
  return Math.round(Math.max(0, contractedTotal - (advancePaid ?? 0) - reductions) * 100) / 100;
}

export interface ResidentMeasurement {
  id: number;
  residentQuantity: number;
  note?: string;
}

/** Payload de resident-approval a partir de los borradores (ya validados). */
export function toMeasurementPayload(items: ClosureReportItem[], drafts: MeasurementDrafts): ResidentMeasurement[] {
  return items.map((item) => {
    const draft = drafts[item.id];
    return { id: item.id, residentQuantity: parseQuantity(draft.quantity) as number, note: draft.note.trim() || undefined };
  });
}
