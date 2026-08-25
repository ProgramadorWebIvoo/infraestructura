/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Variantes de animación compartidas entre vistas.
 * Patrón: container (stagger) + item (spring fade/slide/scale).
 */

import type { Transition, Variants } from "motion/react";

/**
 * Configuraciones de spring reutilizables — evita que cada vista invente
 * su propia combinación de stiffness/damping para el mismo propósito
 * visual (se encontraron 3 divergentes: 260/24, 300/20, 400/20 para
 * casos equivalentes de "aparición" y "pop" de badges/contadores).
 * `gentle` es la misma curva que ya usa `itemVariants` abajo.
 */
export const springs = {
  gentle: { type: "spring", stiffness: 260, damping: 24 },
  snappy: { type: "spring", stiffness: 400, damping: 25 },
} as const satisfies Record<string, Transition>;

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.04 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springs.gentle,
  },
};

/**
 * Fade simple, sin `y`/`scale` — para alternar entre dos vistas de
 * contenido grande con su propio scroll interno (ej. Table ↔ GridView).
 * `itemVariants` no sirve acá: su `scale: 0.98` hace que el contenedor
 * (con su scrollbar) cambie de tamaño visualmente durante la transición,
 * lo que se percibe como "la animación mueve hasta la scrollbar". Sin
 * `y` tampoco, porque desplazar un bloque con scroll propio se siente
 * más como un salto que como una transición suave.
 */
export const viewSwitchVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
};

export const bannerVariants: Variants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginBottom: 20,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};
