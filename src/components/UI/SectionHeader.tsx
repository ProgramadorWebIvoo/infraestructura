/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Encabezado de sección reutilizable: icono + título + descripción.
 */

import type { ReactNode } from "react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Color del contenedor del icono (bg, text, border). Ej: "sky" */
  color?: string;
  /** Acciones opcionales alineadas a la derecha (botones de exportación, etc.). */
  actions?: ReactNode;
}

/**
 * Vocabulario de color histórico de las vistas (8 nombres Tailwind
 * "crudos") mapeado a los 6 roles semánticos de `colorTokens.ts`. La prop
 * `color` sigue aceptando los mismos strings que antes — no se fuerza un
 * rename en las vistas consumidoras, solo cambia qué clases resuelve
 * internamente para no divergir de `SEMANTIC_COLOR_MAP`.
 */
const COLOR_TO_SEMANTIC: Record<string, SemanticColor> = {
  sky: "brand",
  blue: "brand",
  purple: "info",
  indigo: "info",
  emerald: "success",
  amber: "warning",
  rose: "danger",
  slate: "neutral",
};

export default function SectionHeader({ icon, title, description, color = "sky", actions }: SectionHeaderProps) {
  const semantic = SEMANTIC_COLOR_MAP[COLOR_TO_SEMANTIC[color] ?? "brand"];
  const c = { bg: semantic.bg50, text: semantic.text600, border: semantic.border100 };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-2 mb-1">
      <div className="flex items-center gap-3.5">
        <div className={`${c.bg} ${c.text} ${c.border} p-2.5 rounded-xl border`}>
          {icon}
        </div>
        <div>
          <h2 className="font-brand font-black tracking-tight text-text-primary text-base">{title}</h2>
          <p className="text-xs text-text-tertiary font-medium">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
