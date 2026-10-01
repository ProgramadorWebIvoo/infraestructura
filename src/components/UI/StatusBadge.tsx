/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge de estado/rol con color consistente.
 * Usa los mapas unificados de utils.ts.
 * Con `returnInfo` agrega al lado la marca "Devuelto por <rol>" (motivo en tooltip).
 */

import type { ReturnInfo } from "@ivoo/shared";
import { getRoleColor, getStatusColor, STATUS_LABELS } from "@/utils";
import ReturnedBadge from "./ReturnedBadge";

interface StatusBadgeProps {
  /** Código del estado o rol (ej. "CREADO", "ANALISTA", "INFRAESTRUCTURA") */
  code: string;
  /** Texto personalizado (opcional, por defecto usa STATUS_LABELS) */
  label?: string;
  /** Si es un rol en vez de un estado de proyecto */
  isRole?: boolean;
  /** Devolución vigente de la obra: muestra quién la devolvió junto al estado. */
  returnInfo?: ReturnInfo | null;
  className?: string;
}

export default function StatusBadge({ code, label, isRole = false, returnInfo, className = "" }: StatusBadgeProps) {
  const colorClass = isRole ? getRoleColor(code) : getStatusColor(code);
  const displayLabel = label ?? STATUS_LABELS[code] ?? code;

  const badge = (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-pill text-xs font-semibold border ${colorClass} ${className}`}
    >
      {displayLabel}
    </span>
  );

  if (!returnInfo) return badge;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {badge}
      <ReturnedBadge info={returnInfo} className={className} />
    </span>
  );
}
