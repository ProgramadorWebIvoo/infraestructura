/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Encabezado de sección reutilizable: icono + título + descripción.
 */

import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Color del contenedor del icono (bg, text, border). Ej: "sky" */
  color?: string;
  /** Acciones opcionales alineadas a la derecha (botones de exportación, etc.). */
  actions?: ReactNode;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  sky:   { bg: "bg-sky-50",   text: "text-sky-600",   border: "border-sky-100" },
  blue:  { bg: "bg-blue-50",  text: "text-blue-600",  border: "border-blue-100" },
  purple:{ bg: "bg-purple-50",text: "text-purple-600", border: "border-purple-100" },
  emerald:{bg: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  rose:  { bg: "bg-rose-50",  text: "text-rose-600",  border: "border-rose-100" },
  indigo:{ bg: "bg-indigo-50",text: "text-indigo-600", border: "border-indigo-100" },
  slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" },
};

export default function SectionHeader({ icon, title, description, color = "sky", actions }: SectionHeaderProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.sky;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5 mb-6">
      <div className="flex items-center gap-3.5">
        <div className={`${c.bg} ${c.text} ${c.border} p-2.5 rounded-xl border`}>
          {icon}
        </div>
        <div>
          <h2 className="font-sans font-bold text-slate-900 text-base">{title}</h2>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
