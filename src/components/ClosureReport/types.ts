export interface ClosureReportItem {
  id: number;
  name: string;
  unit: string;
  contractedQuantity: number;
  executedQuantity: number;
  unitPriceUsd: number | null;
  /** Nota del contratista (obligatoria si declaró menos de lo contratado). */
  note: string | null;
  /** Lo verificado en obra por el residente (null hasta que da su visto bueno). */
  residentQuantity?: number | null;
  residentNote?: string | null;
  /** Cantidad fijada por Auditoría (null hasta que verifica). */
  auditQuantity?: number | null;
  auditNote?: string | null;
  /** Cantidad que rige el finiquito: Auditoría, o residente, o contratista. */
  finalQuantity?: number;
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

/**
 * apiFetch desenvuelve `.data`: el informe llega plano. `project`/`editable`
 * son opcionales porque el backend los envía fuera de `data` (se pierden al
 * desenvolver); `isClosureEditable` cae al estado del informe cuando faltan.
 */
export type PublicClosureResponse = ClosureReport & {
  project?: { id: string; title: string; location: string };
  editable?: boolean;
};

export function isClosureEditable(report: PublicClosureResponse): boolean {
  return report.editable ?? (report.status === "ABIERTO" || report.status === "RECHAZADO");
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
