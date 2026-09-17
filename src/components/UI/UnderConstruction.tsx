/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Placeholder genérico para módulos temporalmente deshabilitados
 * ("En construcción"): martillo animado + puntos suspensivos cíclicos.
 * Reutilizable por cualquier vista que necesite ocultar su lógica real
 * sin remover la ruta ni el ítem de sidebar.
 */

import { motion, useReducedMotion } from "motion/react";
import { Hammer } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";

interface UnderConstructionProps {
  title?: string;
}

export default function UnderConstruction({ title = "En construcción" }: UnderConstructionProps) {
  const reduceMotion = useReducedMotion();
  const colorMap = SEMANTIC_COLOR_MAP.warning;

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 text-center"
      style={{ height: "calc(100vh - 3rem)" }}
    >
      <h1 className="sr-only">{title}</h1>

      <motion.div
        className={`flex h-20 w-20 items-center justify-center rounded-container ${colorMap.bg100}`}
        animate={reduceMotion ? undefined : { rotate: [0, -25, 0] }}
        transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        <Hammer className={`h-10 w-10 ${colorMap.icon500}`} />
      </motion.div>

      <p className="text-xl font-semibold text-text-primary">
        {title}
        <DotsCycle />
      </p>
      <p className="text-sm text-text-tertiary">Este módulo estará disponible próximamente.</p>
    </div>
  );
}

function DotsCycle() {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}
