/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Badge "Activo/Inactivo" con ícono — extraído del mismo markup manual
 * repetido en las columnas de Proveedores, Materiales y AIConfig (y
 * duplicado a mano en UserRow.tsx pese a que ese archivo ya usa StatusBadge
 * para el rol). No es una variante de StatusBadge porque ese componente está
 * atado a la semántica de estado-de-proyecto/rol (STATUS_COLORS/getRoleColor);
 * este es un booleano activo/inactivo puro con su propio ícono.
 */

import { CheckCircle, XCircle } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

interface ActiveBadgeProps {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export default function ActiveBadge({
  isActive,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  className = "",
}: ActiveBadgeProps) {
  const c = isActive ? SEMANTIC_COLOR_MAP.success : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${
        c ? `${c.border100} ${c.bg50} ${c.text700}` : "border-border-default bg-surface-raised text-text-tertiary"
      } ${className}`}
    >
      {isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}
