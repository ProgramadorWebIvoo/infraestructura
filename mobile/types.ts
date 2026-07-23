/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos para la app mobile. Re-exporta tipos compartidos desde
 * @ivoo/shared y agrega los específicos de mobile (navegación, colores).
 */

import { Ionicons } from "@expo/vector-icons";

// Re-export de tipos compartidos (platform-agnostic)
// Usamos relative path porque mobile (Expo/Metro) no está en el workspace de npm.
export { ProjectStatus } from "../packages/shared/src/types";
export type {
  MaterialItem,
  Proposal,
  Project,
  Contractor,
  AuditLog,
} from "../packages/shared/src/types";

// ---------------------------------------------------------------------------
// Navegación — específico de mobile
// ---------------------------------------------------------------------------

export type Screen =
  | "presidencia"
  | "infraestructura"
  | "cierre"
  | "procura"
  | "analistas"
  | "finanzas"
  | "proveedores"
  | "registro";

export const screens: Array<{ key: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "presidencia", label: "Presidencia", icon: "trending-up" },
  { key: "infraestructura", label: "Infra", icon: "business" },
  { key: "cierre", label: "Cierre", icon: "checkbox" },
  { key: "procura", label: "Procura", icon: "search" },
  { key: "analistas", label: "Analistas", icon: "people" },
  { key: "finanzas", label: "Finanzas", icon: "cash" },
  { key: "proveedores", label: "Proveedores", icon: "construct" },
  { key: "registro", label: "Registro", icon: "person-add" },
];

// ---------------------------------------------------------------------------
// Etiquetas y colores de estado — específicos de mobile (labels más cortos)
// ---------------------------------------------------------------------------

import type { ProjectStatus } from "../packages/shared/src/types";

export const statusLabels: Record<ProjectStatus, string> = {
  CREADO: "Creado",
  REVISADO_CIERRE: "Revisado",
  CONFIRMADO_PROCURA: "Procura OK",
  COMPARATIVA_ENVIADA: "Comparativa",
  CONTRATADO: "Contratado",
  EN_EJECUCION: "Ejecución",
  VERIFICANDO_FINALIZACION: "Verificando",
  LISTO_PAGO_FINAL: "Pago final",
  COMPLETADO_PAGADO: "Completado",
};

export const statusColors: Record<ProjectStatus, string> = {
  CREADO: "#0ea5e9",
  REVISADO_CIERRE: "#3b82f6",
  CONFIRMADO_PROCURA: "#a855f7",
  COMPARATIVA_ENVIADA: "#f59e0b",
  CONTRATADO: "#6366f1",
  EN_EJECUCION: "#06b6d4",
  VERIFICANDO_FINALIZACION: "#f97316",
  LISTO_PAGO_FINAL: "#f43f5e",
  COMPLETADO_PAGADO: "#10b981",
};
