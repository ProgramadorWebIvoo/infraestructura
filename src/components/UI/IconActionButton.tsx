/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Botón de acción icon-only para filas de tabla/tarjeta, con Tooltip
 * integrado en vez de `title` nativo. Promovido desde el RowActionButton
 * local de AIConfigTable.tsx: el mismo shell se reimplementaba casi
 * idéntico en CurrencyCard.tsx, MaterialConfigPanel/columns.tsx,
 * ProveedoresConfigPanel/columns.tsx y ComparativeTableSection.tsx.
 */

import type { ReactNode } from "react";
import Spinner from "./Spinner";
import Tooltip, { type TooltipPlacement } from "./Tooltip";

const TONE_CLASSES: Record<string, string> = {
  slate: "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600",
  sky: "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600",
  indigo: "hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600",
  emerald: "border-emerald-200 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600",
  amber: "border-amber-200 text-amber-400 hover:bg-amber-50 hover:text-amber-600",
  rose: "border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600",
};

interface IconActionButtonProps {
  icon: ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  isBusy?: boolean;
  tone?: keyof typeof TONE_CLASSES;
  placement?: TooltipPlacement;
}

export default function IconActionButton({
  icon,
  label,
  tooltip,
  onClick,
  disabled = false,
  isBusy = false,
  tone = "slate",
  placement = "top",
}: IconActionButtonProps) {
  return (
    <Tooltip content={tooltip} placement={placement}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isBusy}
        className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 ${TONE_CLASSES[tone]}`}
        aria-label={label}
      >
        {isBusy ? <Spinner size="sm" /> : icon}
      </button>
    </Tooltip>
  );
}
