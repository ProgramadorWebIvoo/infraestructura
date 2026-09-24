export interface ClosureReportItem {
  id: number;
  name: string;
  unit: string;
  contractedQuantity: number;
  executedQuantity: number;
  unitPriceUsd: number | null;
  note: string | null;
}

export interface ClosureReportPhoto {
  id: number;
  itemId: number | null;
  uploadedByType: "CONTRATISTA" | "RESIDENTE";
  originalName: string;
  /** Ruta relativa a la base de la API (`projects/{id}/closure-report/photos/{n}` o `public/closures/{token}/photos/{n}`). */
  path: string;
}

export type ClosureReportStatus = "ABIERTO" | "ENVIADO" | "APROBADO_RESIDENTE" | "APROBADO_AUDITORIA" | "RECHAZADO";

export interface ClosureReport {
  id: string;
  projectId: string;
  status: ClosureReportStatus;
  revision: number;
  contractorNotes: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
  rejectedByRole: string | null;
  items: ClosureReportItem[];
  photos: ClosureReportPhoto[];
  contractorCode?: string;
  residentUserId?: number | null;
  residentNotes?: string | null;
  residentVerifiedAt?: string | null;
  auditNotes?: string | null;
  auditVerifiedAt?: string | null;
  finiquitoAmount?: number | null;
}

export interface PublicClosureResponse {
  data: ClosureReport;
  project: { id: string; title: string; location: string };
  editable: boolean;
}

export const CLOSURE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CLOSURE_PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp"];

/** Partida ejecutada por debajo de lo contratado (disminución). */
export function isDecrease(item: Pick<ClosureReportItem, "contractedQuantity" | "executedQuantity">): boolean {
  return item.executedQuantity < item.contractedQuantity;
}

/** Devuelve el mensaje de error de una partida, o null si es válida. */
export function validateClosureItem(item: ClosureReportItem): string | null {
  if (item.executedQuantity > item.contractedQuantity) {
    return "No puede superar lo contratado.";
  }
  if (isDecrease(item) && !(item.note ?? "").trim()) {
    return "Justifique la disminución.";
  }
  return null;
}
