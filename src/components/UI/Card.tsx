/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenedor Card reutilizable con estilo bento consistente.
 */

import type { CSSProperties, ReactNode } from "react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  /** Borde izquierdo de acento (4px) vía SEMANTIC_COLOR_MAP — reemplaza el `border-l-*` manual. */
  accent?: SemanticColor;
  style?: CSSProperties;
  /**
   * Ocupa el 100% del alto que le da su contenedor padre (`h-full flex
   * flex-col min-h-0`) en vez de crecer según su contenido — reemplaza la
   * combinación manual `className="... h-full min-h-0 flex flex-col"` que
   * se repetía en cada Card que participa de un layout de altura
   * compartida contra el viewport (ver el patrón `fillViewport` de
   * `Table.tsx`: el padre define el alto real con
   * `style={{ height: "calc(100vh - Xrem)" }}` + `flex flex-col`, y esta
   * prop hace que la Card se reparta ese alto en vez de imponer el suyo).
   * 100% opt-in — sin esta prop el comportamiento es el de siempre
   * (alto según contenido).
   */
  fillHeight?: boolean;
}

export default function Card({ children, className = "", hoverable = true, accent, style, fillHeight = false }: CardProps) {
  const accentClass = accent ? `border-l-4 ${SEMANTIC_COLOR_MAP[accent].borderL400}` : "";
  const fillHeightClass = fillHeight ? "h-full min-h-0 flex flex-col" : "";

  return (
    <div
      style={style}
      className={`bg-surface rounded-container border border-border-default/80 shadow-sm p-6 ${accentClass} ${fillHeightClass} ${
        hoverable ? "hover:shadow-md transition-all duration-300" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
