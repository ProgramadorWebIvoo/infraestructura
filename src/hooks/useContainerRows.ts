/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Calcula cuántas filas de tabla caben en el alto disponible de un
 * contenedor — evita el problema de `pageSize` fijo (ej. 6) dejando un
 * hueco vacío grande en pantallas altas con `<Table fillViewport>`, o
 * forzando scroll innecesario en pantallas chicas. Se re-mide con
 * ResizeObserver ante cambios de tamaño de ventana/zoom.
 *
 * ── Cómo usarlo en cualquier vista con <Table fillViewport> ──
 *   const { containerRef, rows: pageSize } = useContainerRows();
 *   ...
 *   <div ref={containerRef} className="flex-1 min-h-0">
 *     <Table columns={...} data={...} pageSize={pageSize} fillViewport ... />
 *   </div>
 *
 * `containerRef` va en el MISMO div que hoy envuelve `<Table fillViewport>`
 * (el que tiene `flex-1 min-h-0`) — no en `<Table>` ni en un wrapper nuevo.
 * Si tu tabla no pagina (`pageSize` ausente), pasa `paginated: false` para
 * no restar el alto de una barra de paginación que no existe. Ver
 * RequestsTableSection.tsx / RejectedPetitionsSection.tsx
 * (InfraestructuraMantenimientoPanel) para dos usos reales.
 */

import { useEffect, useRef, useState } from "react";

interface UseContainerRowsOptions {
  /** Alto de cada fila de datos en px (ver Table.tsx: py-3.5 + texto ≈ 44px). */
  rowHeight?: number;
  /** Alto del header de la tabla en px (py-3 + texto ≈ 38px). */
  headerHeight?: number;
  /** Alto de la barra de paginación en px — solo se resta si `paginated`. */
  paginationHeight?: number;
  paginated?: boolean;
  /** Piso — nunca calcula menos de esto, incluso si el contenedor mide 0 antes del primer layout. */
  minRows?: number;
}

export function useContainerRows({
  rowHeight = 44,
  headerHeight = 38,
  paginationHeight = 44,
  paginated = true,
  minRows = 4,
}: UseContainerRowsOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(minRows);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recalculate = () => {
      const available = el.clientHeight - headerHeight - (paginated ? paginationHeight : 0);
      setRows(Math.max(minRows, Math.floor(available / rowHeight)));
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rowHeight, headerHeight, paginationHeight, paginated, minRows]);

  return { containerRef, rows };
}
