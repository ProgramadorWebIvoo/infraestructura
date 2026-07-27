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

export interface ItemRow extends Omit<SupplierMaterialProposalItem, "unitPrice" | "quantity"> {
  _id: string;
  isCustom: boolean;
  unitPrice: number | "";
  quantity: number | "";
}

export type DurationUnit = "dias" | "semanas" | "meses";

export const DURATION_UNITS: { value: DurationUnit; label: string; description: string }[] = [
  { value: "dias", label: "Días", description: "Plazo en días" },
  { value: "semanas", label: "Semanas", description: "Plazo en semanas" },
  { value: "meses", label: "Meses", description: "Plazo en meses" },
];

/** Elimina etiquetas HTML/XML y patrones JS del string para prevenir XSS en renderizados posteriores. */
export function sanitize(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=\s*(['"]?)[^'"\s]*\1/gi, "")
    .replace(/\b(alert|prompt|confirm|print|open|write)\s*\([^)]*\)/gi, "");
}
