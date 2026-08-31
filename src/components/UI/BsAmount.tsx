/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Conversión a Bs. de un monto monetario — fuente única de verdad para todo
 * lo que muestre "equivalente en bolívares" en la app (tablas, modales,
 * formularios, texto corrido). Un solo lugar para el estilo, el skeleton de
 * carga y el fade-in evita que cada vista reinvente su propio
 * `{hasRates && <span>...}` con clases distintas cada vez.
 *
 * Entra con fade-in suave una vez la tasa carga (no aparece de golpe), y
 * muestra un skeleton mientras tanto para no dar la sensación de layout
 * saltando al terminar de cargar.
 *
 * variant="block" (default): línea propia debajo del valor principal — uso
 * en columnas de tabla, cards, filas de detalle key/value.
 * variant="inline": span en el flujo del texto, entre paréntesis — uso en
 * oraciones ("Anticipo liberado: $500 (Bs. 397.495,00)").
 */

import { motion } from "motion/react";
import { formatBs } from "../../hooks/useCurrencyConversion";

interface BsAmountProps {
  amount: number;
  convert: (amount: number, fromCode: string) => number;
  hasRates: boolean;
  isLoading?: boolean;
  fromCode?: string;
  className?: string;
  variant?: "block" | "inline";
}

export default function BsAmount({
  amount,
  convert,
  hasRates,
  isLoading = false,
  fromCode = "USD",
  className = "",
  variant = "block",
}: BsAmountProps) {
  const isInline = variant === "inline";

  if (isLoading && !hasRates) {
    return isInline ? (
      <span className={`inline-block ml-1.5 h-2.5 w-14 rounded skeleton-shimmer align-middle ${className}`} />
    ) : (
      <div className={`ml-auto mt-0.5 h-3 w-16 rounded skeleton-shimmer ${className}`} />
    );
  }

  if (!hasRates) return null;

  const text = `Bs. ${formatBs(convert(amount, fromCode))}`;

  if (isInline) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`font-mono text-[10px] font-semibold text-text-secondary ${className}`}
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
      className={`text-[10px] font-mono font-semibold text-text-secondary ${className}`}
    >
      {text}
    </motion.div>
  );
}
