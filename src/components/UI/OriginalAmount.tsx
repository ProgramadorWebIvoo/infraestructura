/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Monto ORIGINAL con el que un proveedor cotizó, cuando su propuesta llegó
 * en una moneda distinta a la base del sistema y fue convertida al importarla.
 * Fuente única de verdad para mostrar "lo que el proveedor realmente ofertó"
 * en cualquier vista — mismo criterio que `BsAmount` para la conversión a
 * bolívares: un solo lugar define estilo, formato y comportamiento.
 *
 * No renderiza nada cuando la propuesta ya venía en la moneda base (carga
 * manual, o portal cotizando en la misma moneda base) — no hay "original"
 * distinto que mostrar, y ensuciar la UI con "$100 ($100)" sería ruido.
 *
 * variant="block": línea propia bajo el monto convertido (columnas de tabla,
 * filas de detalle). variant="inline": dentro del flujo de texto.
 */

import { motion } from "motion/react";
import { formatCurrency } from "../../utils";

interface OriginalAmountProps {
  /** Monto tal como lo cotizó el proveedor, en `currency`. */
  amount?: number | null;
  /** ISO 4217 de la moneda original (ej. "EUR"). */
  currency?: string | null;
  className?: string;
  variant?: "block" | "inline";
  /** Prefijo antes del monto. Por defecto "Cotizado:" en block, nada en inline. */
  label?: string;
}

export default function OriginalAmount({
  amount,
  currency,
  className = "",
  variant = "block",
  label,
}: OriginalAmountProps) {
  if (amount == null || !currency) return null;

  const isInline = variant === "inline";
  const prefix = label ?? (isInline ? "" : "Cotizado: ");
  const text = `${prefix}${formatCurrency(amount, currency)} ${currency}`;

  if (isInline) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`font-mono text-[10px] font-semibold text-amber-600 ${className}`}
      >
        {" "}({text})
      </motion.span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`text-[10px] font-mono font-semibold text-amber-600 ${className}`}
    >
      {text}
    </motion.div>
  );
}
