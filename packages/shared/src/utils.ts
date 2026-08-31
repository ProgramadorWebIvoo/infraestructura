/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilidades compartidas entre web (src/) y mobile/.
 * NO incluir aquí lógica que dependa del DOM, React o plataforma específica.
 */

import type { SupplierMaterialProposal } from "./types";

// ---------------------------------------------------------------------------
// Tiempo
// ---------------------------------------------------------------------------

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Formato monetario
// ---------------------------------------------------------------------------

/** Trunca (nunca redondea) a `decimals` decimales — los montos monetarios de esta app nunca se redondean. */
export function truncateToDecimals(amount: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.trunc(amount * factor) / factor;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return truncateToDecimals(amount, 2).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Versión sin símbolo de moneda (solo número formateado). */
export function formatNumber(amount: number): string {
  return truncateToDecimals(amount, 2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
// Etiquetas de estado legibles (multi-plataforma)
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<string, string> = {
  CREADO: "Creado",
  RECHAZADO_CIERRE: "Rechazado",
  REVISADO_CIERRE: "Revisado (Cierre)",
  CONFIRMADO_PROCURA: "Confirmado (Procura)",
  COMPARATIVA_ENVIADA: "Comparativa Enviada",
  CONTRATADO: "Contratado",
  EN_EJECUCION: "En Ejecución",
  VERIFICANDO_FINALIZACION: "Verificando",
  LISTO_PAGO_FINAL: "Listo para Pago Final",
  COMPLETADO_PAGADO: "Completado",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
