/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilidades web. Re-exporta las funciones compartidas desde @ivoo/shared
 * y agrega las específicas del frontend (colores Tailwind, etc.).
 */

// Re-export de funciones compartidas (platform-agnostic)
export {
  delay,
  formatCurrency,
  formatNumber,
  formatFileSize,
  proposalTotal,
  STATUS_LABELS,
  getStatusLabel,
} from "@ivoo/shared";

// ---------------------------------------------------------------------------
// Color por rol (web — clases Tailwind), determinístico por hash
// ---------------------------------------------------------------------------
// Tailwind requiere clases literales para su scanner JIT, así que no se
// puede armar un color arbitrario en runtime — en cambio, se elige una
// combinación de una paleta fija vía hash del nombre del rol. Un rol nuevo
// obtiene color automáticamente, sin tocar este archivo.

const ROLE_COLOR_PALETTE: readonly string[] = [
  "bg-violet-100 text-violet-800 border-violet-300",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-slate-100 text-slate-700 border-slate-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
];

function hashRoleName(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getRoleColor(role: string): string {
  if (!role) return "bg-slate-50 text-slate-800 border-slate-200";
  return ROLE_COLOR_PALETTE[hashRoleName(role) % ROLE_COLOR_PALETTE.length];
}

/** Iniciales (hasta 2) de un nombre completo, para avatares — misma regla en sidebar y vistas de usuarios. */
export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

// ---------------------------------------------------------------------------
// Mapa de colores por estado de proyecto (web — clases Tailwind)
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<string, string> = {
  CREADO: "bg-sky-50 text-sky-700 border-sky-200",
  RECHAZADO_CIERRE: "bg-red-50 text-red-700 border-red-200",
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
