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
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      } ${className}`}
    >
      {isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}
