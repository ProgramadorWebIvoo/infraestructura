/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SemanticColor } from "../../components/UI/colorTokens";

export interface ConfigContractor {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  email: string;
  phone: string | null;
  registrationSource: "SEED" | "PUBLIC_PORTAL" | "INTERNAL";
  status: "PENDING_REVIEW" | "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export type ContractorForm = {
  name: string;
  specialty: string;
  email: string;
  phone: string;
  rating: number | "";
  status: "PENDING_REVIEW" | "ACTIVE" | "INACTIVE";
};

export const EMPTY_FORM: ContractorForm = {
  name: "",
  specialty: "",
  email: "",
  phone: "",
  rating: 4.0,
  status: "ACTIVE",
};

// Status options for SelectModal
export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo", description: "Proveedor activo y disponible para licitaciones", raw: "ACTIVE" },
  { value: "INACTIVE", label: "Inactivo", description: "Proveedor desactivado temporalmente", raw: "INACTIVE" },
  { value: "PENDING_REVIEW", label: "Pendiente de revisión", description: "Proveedor pendiente de aprobación", raw: "PENDING_REVIEW" },
];

/**
 * Vocabulario de color específico de esta vista (origen/estado de
 * proveedor) — mapeado a los 6 roles semánticos de `colorTokens.ts` en vez
 * de clases Tailwind escritas a mano, mismo criterio que
 * `SectionHeader.COLOR_TO_SEMANTIC`. Se resuelve en el render vía
 * `SEMANTIC_COLOR_MAP[role]`, no se guarda la clase final acá.
 */
export const SOURCE_BADGE: Record<string, { label: string; role: SemanticColor }> = {
  INTERNAL: { label: "Interno", role: "brand" },
  PUBLIC_PORTAL: { label: "Portal público", role: "info" },
  SEED: { label: "Seed", role: "neutral" },
};

export const STATUS_BADGE: Record<string, { label: string; role: SemanticColor }> = {
  ACTIVE: { label: "Activo", role: "success" },
  INACTIVE: { label: "Inactivo", role: "danger" },
  PENDING_REVIEW: { label: "Pendiente de revisión", role: "warning" },
};
