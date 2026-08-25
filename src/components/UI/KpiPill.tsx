/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Variante compacta de KpiCard: ícono + nombre + dato en una sola fila tipo
 * pill, para vistas donde el KPI es contexto secundario (ej. debajo de una
 * barra de tabs prominente) y la card grande de 4 líneas sería demasiado
 * peso visual.
 */

import type { ReactNode } from "react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

interface KpiPillProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: SemanticColor;
}

export default function KpiPill({ icon, label, value, accent = "brand" }: KpiPillProps) {
  const c = SEMANTIC_COLOR_MAP[accent];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border-default/80 shadow-xs min-w-38 justify-center">
      <span className={c.icon500}>{icon}</span>
      <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-black font-mono ${c.text700}`}>{value}</span>
    </div>
  );
}
