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

/** Símbolo de monedas que no son ISO 4217 (Intl solo acepta códigos de 3 letras y lanza RangeError con otros, ej. "USDT"). */
const NON_ISO_CURRENCY_SYMBOLS: Record<string, string> = { USDT: "₮" };

const ISO_CURRENCY_CODE = /^[A-Za-z]{3}$/;

export function formatCurrency(amount: number, currency = "USD"): string {
  const truncated = truncateToDecimals(amount, 2);

  if (ISO_CURRENCY_CODE.test(currency)) {
    return truncated.toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const symbol = NON_ISO_CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency} `;
  return `${truncated < 0 ? "-" : ""}${symbol}${formatNumber(Math.abs(truncated))}`;
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
  RECHAZADO_AUDITORIA: "Rechazado",
  REVISADO_AUDITORIA: "Revisado (Auditoría)",
  EN_REEVALUACION_AUDITORIA: "En Reevaluación (Auditoría)",
  CONFIRMADO_PROCURA: "Confirmado (Procura)",
  COMPARATIVA_ENVIADA: "Comparativa Enviada",
  PENDIENTE_PRESIDENCIA: "Pendiente de Presidencia",
  APROBADO_PRESIDENCIA: "Aprobado por Presidencia",
  CONTRATADO: "Contratado",
  EN_EJECUCION: "En Ejecución",
  INFORME_ENVIADO: "Informe recibido (falta el otro)",
  VERIFICANDO_FINALIZACION: "Pendiente de Auditoría",
  PENDIENTE_SOLICITUD_FINIQUITO: "Pendiente de solicitud de finiquito",
  LISTO_PAGO_FINAL: "Listo para Pago Final",
  COMPLETADO_PAGADO: "Completado",
  // Flujo de Marketing (marketing_projects) — códigos propios, sin
  // colisión con los de arriba (flujo de obra).
  BORRADOR: "Borrador",
  EN_REVISION: "En Revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// ---------------------------------------------------------------------------
// Idempotencia
// ---------------------------------------------------------------------------

/**
 * UUID v4 para el header `Idempotency-Key`. `crypto.randomUUID()` solo existe en
 * contextos seguros (https o localhost): en dev, el front se sirve por IP de la
 * red local sobre http y ahí no está definido, así que se cae a
 * `getRandomValues` (disponible en cualquier contexto) antes que a Math.random.
 */
export function generateIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
