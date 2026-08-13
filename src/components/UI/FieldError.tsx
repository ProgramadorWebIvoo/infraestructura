/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mensaje de error inline para un campo de formulario. Reutilizable en
 * cualquier input/textarea/select: `useFieldErrorClasses(hasError)` da las
 * clases de borde/foco en rojo para el control, y `<FieldError message />`
 * el texto debajo. Diseñado para poder anclar el error a un id concreto
 * (ej. el id de un setting) y así saber en qué campo mostrarlo.
 */

export function fieldErrorClasses(hasError: boolean): string {
  return hasError ? "border-rose-400! focus:border-rose-400! focus:ring-rose-100!" : "";
}

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export default function FieldError({ message, className = "" }: FieldErrorProps) {
  if (!message) return null;
  return <p className={`text-[11px] font-semibold text-rose-500 mt-1 ${className}`}>{message}</p>;
}
