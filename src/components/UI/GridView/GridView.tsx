/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Grid virtualizado de tarjetas genérico — variante de visualización
 * alternativa a Table.tsx, con la misma filosofía de genericidad
 * (`renderCard` es al GridView lo que `Column.render` es a Table): el
 * componente no conoce el dominio de los items, solo resuelve layout,
 * virtualización, animación y selección.
 *
 * Virtualiza por FILAS (no celda por celda) — @tanstack/react-virtual es
 * 1D nativamente, así que columnsPerRow se deriva de `width` (medido por
 * useFullViewport) y `minCardWidth`, y cada fila virtualizada renderiza sus
 * N tarjetas vía items.slice(). Patrón estándar de los ejemplos oficiales
 * de la librería para grids — evita virtualización 2D hecha a mano.
 */

import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "motion/react";
import { containerVariants } from "../../../animations";
import GridCard from "./GridCard";
import { useFullViewport } from "./useFullViewport";
import type { GridViewProps } from "./types";

const GAP = 12;

export default function GridView<T>({
  items,
  rowKey,
  renderCard,
  cardAccent,
  onSelect,
  selectedKey,
  minCardWidth = 280,
  estimateRowHeight = 180,
  emptyState,
  className = "",
}: GridViewProps<T>) {
  const { containerRef, width, height } = useFullViewport();

  const columnsPerRow = Math.max(1, Math.floor((width + GAP) / (minCardWidth + GAP)));
  const rowCount = Math.ceil(items.length / columnsPerRow);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateRowHeight + GAP,
    overscan: 3,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const rowsData = useMemo(() => {
    const rows: T[][] = [];
    for (let i = 0; i < rowCount; i++) {
      rows.push(items.slice(i * columnsPerRow, (i + 1) * columnsPerRow));
    }
    return rows;
  }, [items, rowCount, columnsPerRow]);

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div ref={containerRef} className={`h-full overflow-y-auto ${className}`}>
      {width > 0 && height > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualRows.map((virtualRow) => {
            const rowItems = rowsData[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid gap-3 pb-3"
                data-gridview-row
              >
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))` }}
                >
                  {rowItems.map((item, colIndex) => {
                    const key = rowKey(item, virtualRow.index * columnsPerRow + colIndex);
                    return (
                      <GridCard
                        key={key}
                        cardKey={key}
                        accent={cardAccent?.(item)}
                        isSelected={selectedKey !== undefined && key === selectedKey}
                        onClick={onSelect ? () => onSelect(item) : undefined}
                      >
                        {renderCard(item, virtualRow.index * columnsPerRow + colIndex)}
                      </GridCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
