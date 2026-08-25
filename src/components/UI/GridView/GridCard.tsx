/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Envoltorio genérico de tarjeta para GridView — borde/fondo/hover/tap/
 * selección resueltos aquí; el CONTENIDO interno lo decide el consumidor vía
 * `renderCard` (GridView.tsx). No conoce el dominio del item.
 */

import { memo } from "react";
import { motion } from "motion/react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "../colorTokens";
import { itemVariants } from "../../../animations";

/** Clases de ring literales por rol — Tailwind JIT no puede resolver clases
 * construidas en runtime (ej. `text600.replace("text-", "ring-")`), necesita
 * ver el string completo en el código fuente. */
const RING_CLASSES: Record<SemanticColor, string> = {
  brand: "ring-brand-500",
  success: "ring-success-500",
  danger: "ring-danger-500",
  warning: "ring-warning-500",
  info: "ring-info-500",
  neutral: "ring-neutral-500",
};

interface GridCardProps {
  cardKey: string | number;
  children: React.ReactNode;
  accent?: SemanticColor;
  isSelected: boolean;
  onClick?: () => void;
}

function GridCardImpl({ children, accent = "neutral", isSelected, onClick }: GridCardProps) {
  const c = SEMANTIC_COLOR_MAP[accent];

  return (
    <motion.div
      variants={itemVariants}
      layout
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`rounded-xl border bg-white shadow-sm hover:shadow-lg transition-shadow cursor-pointer overflow-hidden ${
        isSelected ? `${c.border100} ring-2 ring-offset-1 ${RING_CLASSES[accent]}` : c.border100
      }`}
    >
      {children}
    </motion.div>
  );
}

function areCardPropsEqual(prev: GridCardProps, next: GridCardProps) {
  return (
    prev.cardKey === next.cardKey &&
    prev.children === next.children &&
    prev.accent === next.accent &&
    prev.isSelected === next.isSelected &&
    prev.onClick === next.onClick
  );
}

export default memo(GridCardImpl, areCardPropsEqual);
