/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Funciones utilitarias compartidas.
 */

import type { Project, SupplierMaterialProposal } from "./types";

// ---------------------------------------------------------------------------
// Tiempo
// ---------------------------------------------------------------------------

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Formato monetario
// ---------------------------------------------------------------------------

export function formatCurrency(amount: number, currency = "USD"): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Versión sin símbolo de moneda (solo número formateado). */
export function formatNumber(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------

export function proposalTotal(p: SupplierMaterialProposal): number {
  return p.items.reduce((sum, i) => sum + i.totalPrice, 0);
}

// ---------------------------------------------------------------------------
// Mapa de colores por rol (unificado)
// ---------------------------------------------------------------------------

export const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-violet-100 text-violet-800 border-violet-300",
  ADMIN: "bg-amber-50 text-amber-700 border-amber-200",
  PRESIDENCIA: "bg-amber-50 text-amber-800 border-amber-200",
  INFRAESTRUCTURA: "bg-sky-50 text-sky-700 border-sky-200",
  CIERRE_DE_OBRA: "bg-blue-50 text-blue-700 border-blue-200",
  PROCURA: "bg-purple-50 text-purple-700 border-purple-200",
  ANALISTA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FINANZAS: "bg-rose-50 text-rose-700 border-rose-200",
  CATALOGOS: "bg-slate-100 text-slate-700 border-slate-200",
  SISTEMA: "bg-slate-50 text-slate-800 border-slate-200",
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] ?? "bg-slate-50 text-slate-800 border-slate-200";
}

// ---------------------------------------------------------------------------
// Mapa de colores por estado de proyecto
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<string, string> = {
  CREADO: "bg-sky-50 text-sky-700 border-sky-200",
  REVISADO_CIERRE: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMADO_PROCURA: "bg-purple-50 text-purple-700 border-purple-200",
  COMPARATIVA_ENVIADA: "bg-amber-50 text-amber-700 border-amber-200",
  CONTRATADO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  EN_EJECUCION: "bg-cyan-50 text-cyan-700 border-cyan-200",
  VERIFICANDO_FINALIZACION: "bg-orange-50 text-orange-700 border-orange-200",
  LISTO_PAGO_FINAL: "bg-rose-50 text-rose-700 border-rose-200",
  COMPLETADO_PAGADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "bg-slate-50 text-slate-700 border-slate-200";
}

// ---------------------------------------------------------------------------
// Etiquetas de estado legibles
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<string, string> = {
  CREADO: "Creado",
  REVISADO_CIERRE: "Revisado (Cierre)",
  CONFIRMADO_PROCURA: "Confirmado (Procura)",
  COMPARATIVA_ENVIADA: "Comparativa Enviada",
  CONTRATADO: "Contratado",
  EN_EJECUCION: "En Ejecución",
  VERIFICANDO_FINALIZACION: "Verificando",
  LISTO_PAGO_FINAL: "Listo para Pago Final",
  COMPLETADO_PAGADO: "Completado",
};
