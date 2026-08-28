/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupplierMaterialProposalItem } from "../../types";

export interface ProjectPublicData {
  id: string;
  title: string;
  location: string;
  type: string;
  description: string;
  materials: { id: string; name: string; quantity: number; unit: string; estimatedUnitPrice: number }[];
}

export interface InvitationPublicInfo {
  supplierName: string;
  supplierCompany?: string;
  supplierContact: string;
  project: ProjectPublicData;
}

export interface ItemRow extends Omit<SupplierMaterialProposalItem, "unitPrice" | "quantity" | "technicalSpecs" | "conditionStatus" | "warrantyValue"> {
  _id: string;
  isCustom: boolean;
  unitPrice: number | "";
  quantity: number | "";
  technicalSpecs: Record<string, string | number | boolean>;
  /** "" = sin seleccionar todavía — sin precarga, el proveedor debe elegirla a propósito. */
  conditionStatus?: ConditionStatus | "";
  /** "" = campo no tocado (NumericInput no precargado) — distinto de 0, que es un valor real cargado. */
  warrantyValue?: number | "";
  /** Solo en memoria del formulario, para saber qué spec_schema mostrar — no se envía al backend. */
  categoryId?: number | null;
}

export type DurationUnit = "dias" | "semanas" | "meses";

export const DURATION_UNITS: { value: DurationUnit; label: string; description: string }[] = [
  { value: "dias", label: "Días", description: "Plazo en días" },
  { value: "semanas", label: "Semanas", description: "Plazo en semanas" },
  { value: "meses", label: "Meses", description: "Plazo en meses" },
];

export type ConditionStatus = "new" | "used" | "refurbished";

export const CONDITION_OPTIONS: { value: ConditionStatus; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "used", label: "Usado" },
  { value: "refurbished", label: "Reacondicionado" },
];

export interface PublicCurrency {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
}

export interface SpecSchemaField {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  unit?: string;
  required?: boolean;
  options?: string[];
}

export interface PublicCatalogCategory {
  id: number;
  name: string;
  parent_id: number | null;
  spec_schema: SpecSchemaField[] | null;
}

export interface CatalogProductSearchResult {
  id: number;
  name: string;
  unit: string;
  category_id: number | null;
}

/** Elimina etiquetas HTML/XML y patrones JS del string para prevenir XSS en renderizados posteriores. */
export function sanitize(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=\s*(['"]?)[^'"\s]*\1/gi, "")
    .replace(/\b(alert|prompt|confirm|print|open|write)\s*\([^)]*\)/gi, "");
}
