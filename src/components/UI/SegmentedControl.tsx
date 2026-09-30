/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Control de opciones excluyentes: "pill" para tabs compactas, "card" para
 * bloques grandes con icono+descripción (radiogroup accesible). Extraído
 * tras 3 usos reales del mismo patrón (tipo de requerimiento, condición
 * nuevo/usado, tabs catálogo/personalizado) repitiendo clases a mano.
 */

import type { ReactNode } from "react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Sobreescribe el accent global del control solo para esta opción. */
  accent?: SemanticColor;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "pill" | "card";
  /** Solo variant="pill": "sm" para barras compactas junto a KpiPills. */
  size?: "sm" | "md";
  accent?: SemanticColor;
  /** Requerido en variant="card" — nombra el radiogroup para accesibilidad. */
  ariaLabel?: string;
  id?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "pill",
  size = "md",
  accent = "brand",
  ariaLabel,
  id,
}: SegmentedControlProps<T>) {
  if (variant === "pill") {
    const isSmall = size === "sm";
    return (
      <div
        id={id}
        role={ariaLabel ? "group" : undefined}
        aria-label={ariaLabel}
        className={`flex gap-1 bg-slate-100/60 rounded-xl font-bold w-fit ${isSmall ? "p-0.5 text-[11px]" : "p-1 text-xs"}`}
      >
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={ariaLabel ? isActive : undefined}
              onClick={() => onChange(opt.value)}
              className={`${isSmall ? "px-2.5 py-1" : "px-4 py-2"} rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? `bg-white ${SEMANTIC_COLOR_MAP[opt.accent ?? accent].text700} shadow-xs border border-slate-200/80 font-black`
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  const GRID_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
  const gridColsClass = GRID_COLS[options.length] ?? "grid-cols-2";

  return (
    <div id={id} role="radiogroup" aria-label={ariaLabel} className={`grid ${gridColsClass} gap-2`}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        const c = SEMANTIC_COLOR_MAP[opt.accent ?? accent];
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              isActive
                ? `${c.border200} bg-gradient-to-br ${c.bg50} to-white ${c.text700} ring-2 ${c.border100} shadow-sm`
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            {opt.icon && <span className={isActive ? c.icon500 : "text-slate-400"}>{opt.icon}</span>}
            <span className="min-w-0">
              <span className="block text-xs font-bold">{opt.label}</span>
              {opt.description && (
                <span className="block text-[10px] font-medium opacity-80 truncate">{opt.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
