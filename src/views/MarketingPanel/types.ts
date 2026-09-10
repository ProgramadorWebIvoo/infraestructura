/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos locales del módulo Marketing — reflejan el shape de
 * MarketingProjectResource (backend, infraestructura-back). Viven acá y no
 * en @ivoo/shared porque, a diferencia de Project, este flujo todavía no
 * tiene contraparte fuera del frontend (móvil, etc.) — se promueven a
 * shared el día que la necesiten.
 */

export type MarketingProjectType = "IMPRESION" | "VINIL" | "PENDON" | "OTRO";
export type MarketingProjectPriority = "BAJA" | "MEDIA" | "ALTA";
export type MarketingProjectStatus = "BORRADOR" | "EN_REVISION" | "APROBADO" | "RECHAZADO";

export interface MarketingProjectAttachment {
  id: number;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: number;
  uploadedAt: string | null;
}

export interface MarketingProject {
  id: string;
  title: string;
  type: MarketingProjectType;
  description: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  quantity: number | null;
  estimatedCost: number | null;
  priority: MarketingProjectPriority;
  status: MarketingProjectStatus;
  rejectionReason: string | null;
  requestedBy: number;
  requestedByName: string | null;
  reviewedBy: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  attachments: MarketingProjectAttachment[];
  createdAt: string;
  updatedAt: string;
}

export const MARKETING_TYPE_LABELS: Record<MarketingProjectType, string> = {
  IMPRESION: "Impresión",
  VINIL: "Vinil",
  PENDON: "Pendón",
  OTRO: "Otro",
};

export const MARKETING_PRIORITY_LABELS: Record<MarketingProjectPriority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
};

/** Acento semántico por prioridad — consumido con SEMANTIC_COLOR_MAP, mismo vocabulario que el resto de la UI. */
export const MARKETING_PRIORITY_ACCENT: Record<MarketingProjectPriority, "neutral" | "warning" | "danger"> = {
  BAJA: "neutral",
  MEDIA: "warning",
  ALTA: "danger",
};

/**
 * Payload del formulario de creación — mismo shape (camelCase) que
 * StoreMarketingProjectRequest en el backend, listo para enviarse tal cual
 * a POST /marketing-projects. `quantity`/`estimatedCost` en number | ""
 * porque así los maneja NumericInput mientras el campo está vacío.
 */
export interface MarketingProjectFormInput {
  title: string;
  type: MarketingProjectType;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  quantity: number | "";
  estimatedCost: number | "";
  priority: MarketingProjectPriority;
}
