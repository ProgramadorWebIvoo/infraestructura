/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Indicadores visuales pequeños para composición junto a labels de campos:
 * RequiredMark (campo obligatorio) y HelpHint (ícono de ayuda con Tooltip).
 * Se exportan por separado en vez de un componente con `variant` porque
 * tienen forma/comportamiento distintos — RequiredMark es un target con
 * Tooltip que refleja el estado actual del campo, HelpHint es un target
 * interactivo de ayuda estática. Sin opinión sobre el layout del label: se
 * componen en el call site.
 */

import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Tooltip, { type TooltipPlacement } from "./Tooltip";

interface RequiredMarkProps {
  /** Si el campo tiene valor cargado — determina el ícono (alerta/check) y el texto del tooltip. */
  filled: boolean;
  placement?: TooltipPlacement;
  className?: string;
}

/**
 * Indicador dinámico de campo obligatorio: triángulo de alerta rojo con
 * tooltip "Este campo es obligatorio" mientras está vacío, y check verde
 * con tooltip "¡Válido!" apenas se completa — feedback inmediato en vez de
 * un asterisco estático que no dice nada hasta el submit.
 */
export function RequiredMark({ filled, placement = "top", className = "" }: RequiredMarkProps) {
  return (
    <Tooltip content={filled ? "¡Válido!" : "Este campo es obligatorio"} placement={placement}>
      <span
        className={`relative inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center align-[-2px] ${className}`}
        aria-label={filled ? "Campo obligatorio completo" : "Campo obligatorio pendiente"}
      >
        <AnimatePresence initial={false} mode="wait">
          {filled ? (
            <motion.span
              key="valid"
              initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="pending"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </Tooltip>
  );
}

interface HelpHintProps {
  content: string;
  placement?: TooltipPlacement;
  className?: string;
}

export function HelpHint({ content, placement = "top", className = "" }: HelpHintProps) {
  return (
    <Tooltip content={content} placement={placement}>
      <button
        type="button"
        className={`inline-flex cursor-help items-center text-slate-300 hover:text-slate-500 ${className}`}
        aria-label="Ayuda"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
