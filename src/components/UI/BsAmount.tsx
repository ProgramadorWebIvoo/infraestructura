/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Línea secundaria que muestra la conversión a Bs. de un monto monetario.
 * Reutilizable en cualquier tabla/detalle que muestre valores en USD (u otra
 * moneda) y quiera mostrar también su equivalente en bolívares del día.
 * Entra con fade-in suave una vez la tasa carga (no aparece de golpe), y
 * muestra un skeleton mientras tanto para no dar la sensación de layout
 * saltando al terminar de cargar.
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
}

export default function BsAmount({ amount, convert, hasRates, isLoading = false, fromCode = "USD", className = "" }: BsAmountProps) {
  if (isLoading && !hasRates) {
    return <div className={`ml-auto mt-0.5 h-3 w-16 rounded skeleton-shimmer ${className}`} />;
  }

  if (!hasRates) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`text-[10px] font-mono font-semibold text-text-secondary ${className}`}
    >
      Bs. {formatBs(convert(amount, fromCode))}
    </motion.div>
  );
}
