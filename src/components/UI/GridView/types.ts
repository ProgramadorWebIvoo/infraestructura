/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tipos del GridView genérico — mismo principio que `Column<T>` en Table.tsx:
 * el componente no conoce el dominio de los items, el consumidor decide qué
 * pintar dentro de cada tarjeta vía `renderCard`.
 */

import type { ReactNode } from "react";
import type { SemanticColor } from "../colorTokens";

export interface GridViewProps<T> {
  items: T[];
  rowKey: (item: T, index: number) => string | number;
  /** El consumidor decide qué pintar dentro de cada tarjeta — mismo principio que `Column.render` en Table. */
  renderCard: (item: T, index: number) => ReactNode;
  /** Accent semántico opcional por tarjeta (ej. "danger" para un item en estado de alerta) — GridView no interpreta el dominio, solo aplica el rol que el consumidor indique. */
  cardAccent?: (item: T) => SemanticColor | undefined;
  onSelect?: (item: T) => void;
  selectedKey?: string | number;
  /** Ancho mínimo estimado de una tarjeta en px — determina cuántas columnas caben por fila. */
  minCardWidth?: number;
  /** Alto estimado de una fila en px — usado por el virtualizador antes de medir filas reales. */
  estimateRowHeight?: number;
  emptyState?: ReactNode;
  className?: string;
}
