/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Indicadores visuales pequeños para composición junto a labels de campos:
 * RequiredMark (campo obligatorio) y HelpHint (ícono de ayuda con Tooltip).
 * Se exportan por separado en vez de un componente con `variant` porque
 * tienen forma/comportamiento distintos — RequiredMark es un glifo estático,
 * HelpHint es un target interactivo que compone Tooltip.tsx. Sin opinión
 * sobre el layout del label: se componen en el call site.
 */

import { HelpCircle } from "lucide-react";
import Tooltip, { type TooltipPlacement } from "./Tooltip";

export function RequiredMark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-rose-500 ${className}`}>
      <span aria-hidden="true">*</span>
      <span className="sr-only">(obligatorio)</span>
    </span>
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
