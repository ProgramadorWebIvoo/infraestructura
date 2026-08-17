/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge de estado/rol con color consistente.
 * Usa los mapas unificados de utils.ts.
 */

import { getRoleColor, getStatusColor, STATUS_LABELS } from "../../utils";

interface StatusBadgeProps {
  /** Código del estado o rol (ej. "CREADO", "ANALISTA", "INFRAESTRUCTURA") */
  code: string;
  /** Texto personalizado (opcional, por defecto usa STATUS_LABELS) */
  label?: string;
  /** Si es un rol en vez de un estado de proyecto */
  isRole?: boolean;
  className?: string;
}

export default function StatusBadge({ code, label, isRole = false, className = "" }: StatusBadgeProps) {
  const colorClass = isRole ? getRoleColor(code) : getStatusColor(code);
  const displayLabel = label ?? STATUS_LABELS[code] ?? code;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-pill text-xs font-semibold border ${colorClass} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
