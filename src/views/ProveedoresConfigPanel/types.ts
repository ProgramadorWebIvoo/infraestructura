/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfigContractor {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  contact: string;
  registrationSource: "SEED" | "PUBLIC_PORTAL" | "INTERNAL";
  status: "PENDING_REVIEW" | "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export type ContractorForm = {
  name: string;
  specialty: string;
  contact: string;
  rating: number | "";
  status: "PENDING_REVIEW" | "ACTIVE" | "INACTIVE";
};

export const EMPTY_FORM: ContractorForm = {
  name: "",
  specialty: "",
  contact: "",
  rating: 4.0,
  status: "ACTIVE",
};

// Status options for SelectModal
export const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo", description: "Proveedor activo y disponible para licitaciones", raw: "ACTIVE" },
  { value: "INACTIVE", label: "Inactivo", description: "Proveedor desactivado temporalmente", raw: "INACTIVE" },
  { value: "PENDING_REVIEW", label: "Pendiente de revisión", description: "Proveedor pendiente de aprobación", raw: "PENDING_REVIEW" },
];

export const SOURCE_BADGE: Record<string, { label: string; class: string }> = {
  INTERNAL:      { label: "Interno",        class: "bg-sky-50 text-sky-700 border-sky-200" },
  PUBLIC_PORTAL: { label: "Portal público", class: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SEED:          { label: "Seed",           class: "bg-slate-100 text-slate-500 border-slate-200" },
};

export const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  ACTIVE:         { label: "Activo",              class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INACTIVE:       { label: "Inactivo",            class: "bg-red-50 text-red-700 border-red-200" },
  PENDING_REVIEW: { label: "Pendiente de revisión", class: "bg-amber-50 text-amber-700 border-amber-200" },
};
