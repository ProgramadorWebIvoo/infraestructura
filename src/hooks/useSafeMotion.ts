/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSafeMotion — Hook centralizado que respeta prefers-reduced-motion.
 * Cualquier componente que use animaciones motion debe usar este hook
 * para evitar problemas vestibulares en usuarios con sensibilidad al movimiento.
 *
 * Uso:
 *   const { containerVariants, itemVariants, safeTransition } = useSafeMotion();
 *   // o bien:
 *   const { motionProps } = useSafeMotion({ initial: { opacity: 0, y: 10 } });
 */

import { useReducedMotion } from "motion/react";
import type { Variants, Transition } from "motion/react";

interface SafeMotionOptions {
  /** Variant para estado inicial/oculto */
  initial?: Record<string, unknown>;
  /** Variant para estado visible */
  enter?: Record<string, unknown>;
  /** Variant para estado de salida */
  exit?: Record<string, unknown>;
  /** Transición por defecto */
  transition?: Transition;
}

export function useSafeMotion(opts?: SafeMotionOptions) {
  const prefersReduced = useReducedMotion();

  const sansMotion = {
    initial: { opacity: 1 },
    enter: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 },
  };

  const normal = {
    initial: opts?.initial ?? { opacity: 0, y: 10 },
    enter: opts?.enter ?? { opacity: 1, y: 0 },
    exit: opts?.exit ?? { opacity: 0, y: -10 },
    transition: opts?.transition ?? { duration: 0.22, ease: "easeOut" },
  };

  return {
    prefersReduced: !!prefersReduced,
    motionProps: prefersReduced ? sansMotion : normal,
    containerVariants: prefersReduced
      ? ({
          hidden: { opacity: 1 },
          visible: { opacity: 1 },
        } as Variants)
      : ({
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { when: "beforeChildren", staggerChildren: 0.04 },
          },
        } as Variants),
    itemVariants: prefersReduced
      ? ({
          hidden: { opacity: 1 },
          visible: { opacity: 1 },
        } as Variants)
      : ({
          hidden: { opacity: 0, y: 10, scale: 0.98 },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 260, damping: 24 },
          },
        } as Variants),
  };
}
