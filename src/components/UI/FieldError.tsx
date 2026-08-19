/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mensaje de error inline para un campo de formulario. Reutilizable en
 * cualquier input/textarea/select: `useFieldErrorClasses(hasError)` da las
 * clases de borde/foco en rojo para el control, y `<FieldError message />`
 * el texto debajo. Diseñado para poder anclar el error a un id concreto
 * (ej. el id de un setting) y así saber en qué campo mostrarlo.
 *
 * El texto entra/sale con una transición corta (altura+opacidad) en vez de
 * aparecer/desaparecer de golpe — evita el salto brusco de layout cuando un
 * campo pasa de válido a inválido (o viceversa) mientras el usuario escribe.
 */

import { AnimatePresence, motion } from "motion/react";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

export function fieldErrorClasses(hasError: boolean): string {
  if (!hasError) return "";
  return `border-danger-400! focus:border-danger-400! focus:ring-danger-100!`;
}

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export default function FieldError({ message, className = "" }: FieldErrorProps) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 4 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`text-[11px] font-semibold ${SEMANTIC_COLOR_MAP.danger.text600} overflow-hidden ${className}`}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
