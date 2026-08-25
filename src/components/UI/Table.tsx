// Generic reusable Table component
// Encapsulates: header styling, loading skeleton, empty state, row hover/alternating,
// footer, scroll containers, sorting, pagination

import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SkeletonBlock } from "../SkeletonLoader";
import { itemVariants } from "../../animations";

// ─── Types ───

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  sortable?: boolean;
  /** Custom render. When omitted, renders `row[key]` as text. */
  render?: (row: T, index: number) => React.ReactNode;
  /**
   * Valor a usar al ordenar por esta columna, cuando el dato mostrado no es
   * un campo directo de `row` (ej. un conteo derivado calculado por el
   * consumidor). Si se omite, se ordena por `row[key]` como antes —
   * 100% retrocompatible.
   */
  sortValue?: (row: T) => string | number;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;

  // Loading
  isLoading?: boolean;
  loadingRows?: number;

  // Empty state
  emptyMessage?: string;
  /** If provided, replaces the default empty-message row entirely (e.g. <EmptyState />) */
  emptyState?: React.ReactNode;

  // Footer (rendered inside <tfoot>)
  footer?: React.ReactNode;

  // Pagination
  /** Enables pagination. Default 20 when enabled. */
  pageSize?: number;

  // Container & scroll
  /** Alto fijo del contenedor scrolleable (ej. "29rem"). Ignorado si `fillViewport` está activo. */
  maxHeight?: string;
  /**
   * Hace que la tabla ocupe el 100% del alto que le da su contenedor padre
   * (`h-full flex flex-col`) en vez de un `maxHeight` fijo en rem — el
   * contenedor scrolleable interno usa `flex-1 min-h-0` para repartirse el
   * espacio disponible con la barra de paginación (que ya no queda "fuera"
   * del cálculo: al ser flex-col, la paginación ocupa su alto natural y el
   * `flex-1` de la tabla se ajusta solo). Pensado para usarse junto a otro
   * elemento del mismo alto en un layout flex/grid (ej. `ConfigAuditLogPanel`
   * al lado, con su propio `fillViewport` calculado contra el viewport) — el
   * padre determina el alto total y ambos hijos lo comparten, en vez de que
   * cada uno calcule independientemente contra `window.innerHeight` (dos
   * cálculos por separado nunca calzan exacto al píxel). El padre necesita
   * `h-full`/`flex-1 min-h-0` en cascada desde el contenedor que define el
   * alto real (ver `UsuariosPanel`/`ProveedoresConfigPanel`/`MaterialConfigPanel`
   * para el patrón completo). `maxHeight` sigue funcionando igual si no se
   * activa esta prop — 100% opt-in.
   */
  fillViewport?: boolean;
  containerClassName?: string;

  // Table element classes
  className?: string;
  stickyHeader?: boolean;

  // Visual overrides
  rowHoverClass?: string;
  /** When true, rows alternate bg-white / bg-slate-50/40 */
  alternating?: boolean;

  // Row click handler
  /** Called when a row is clicked. Receives the row data and index. */
  onRowClick?: (row: T, index: number) => void;
  /** Called when a row is double-clicked. Receives the row data and index. */
  onRowDoubleClick?: (row: T, index: number) => void;
  /** Optional: custom class for selected row */
  selectedRowKey?: string | number;
  selectedRowClass?: string;
}

// ─── Component ───

export function Table<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  loadingRows = 5,
  emptyMessage = "No hay datos disponibles.",
  emptyState,
  footer,
  pageSize,
  maxHeight,
  fillViewport = false,
  containerClassName = "",
  className = "",
  stickyHeader = false,
  rowHoverClass = "hover:bg-sky-50/70",
  alternating = true,
  onRowClick,
  onRowDoubleClick,
  selectedRowKey,
  selectedRowClass = "bg-sky-50 ring-1 ring-inset ring-sky-300",
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const paginationEnabled = pageSize != null && pageSize > 0;
  const limit = paginationEnabled ? pageSize! : data.length;

  // ── Sorting ──

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    const activeColumn = columns.find((c) => c.key === sortColumn);
    const getValue = (row: T) => (activeColumn?.sortValue ? activeColumn.sortValue(row) : row[sortColumn as keyof T]);
    return [...data].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp =
        typeof aVal === "string" && typeof bVal === "string"
          ? aVal.localeCompare(bVal)
          : Number(aVal) - Number(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, columns, sortColumn, sortDir]);

  // ── Pagination ──

  const totalPages = paginationEnabled ? Math.max(1, Math.ceil(sortedData.length / limit)) : 1;

  // Reset síncrono a la página 1 cuando cambia el dataset de origen (ej. un
  // filtro externo como el pipeline de etapas) — hacerlo solo en un
  // useEffect (efecto, corre DESPUÉS del render) deja un frame intermedio
  // donde paginatedData ya se calculó con el currentPage viejo contra el
  // data nuevo, mostrando "sin resultados" incluso cuando sí los hay. Con
  // AnimatePresence mode="wait" ese frame vacío monta la rama "empty" y la
  // corrección posterior del efecto puede quedar atascada esperando a que
  // termine esa transición de salida — visible como "no se muestra nada
  // hasta recargar la vista". Comparar `data` por referencia y resetear en
  // el mismo render evita ese frame intermedio.
  const dataRef = useRef(data);
  if (dataRef.current !== data) {
    dataRef.current = data;
    if (currentPage !== 1) setCurrentPage(1);
  }

  // Aun así, cubrir el caso en que solo cambia `pageSize`/ordenamiento
  // reduce totalPages sin que `data` cambie de referencia.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    if (!paginationEnabled) return sortedData;
    const from = (currentPage - 1) * limit;
    return sortedData.slice(from, from + limit);
  }, [sortedData, paginationEnabled, currentPage, limit]);

  const fromItem = paginationEnabled ? (currentPage - 1) * limit + 1 : 1;
  const toItem = paginationEnabled ? Math.min(currentPage * limit, sortedData.length) : sortedData.length;

  // ── Sort toggle ──

  const toggleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDir("asc");
    }
    setCurrentPage(1); // reset to first page on sort change
  };

  // ── Page helpers ──

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  // ── Render helpers ──

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null;
    if (sortColumn !== column.key) return <ChevronsUpDown className="h-3 w-3 ml-1 shrink-0 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1 shrink-0" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
    );
  };

  const thAlign = (col: Column<T>) =>
    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";

  const tdAlign = (col: Column<T>) =>
    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "";

  // ── Skeleton rows ──

  const skeletonRowCount = paginationEnabled ? Math.min(limit, loadingRows) : loadingRows;

  // ── Pagination controls ──

  const PaginationBar = () => {
    if (!paginationEnabled || sortedData.length === 0) return null;

    // Build page numbers to display
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30 text-xs shrink-0">
        {/* Info */}
        <span className="text-slate-500 font-medium hidden sm:inline">
          Mostrando <span className="font-bold text-slate-700">{fromItem}</span>
          {" — "}
          <span className="font-bold text-slate-700">{toItem}</span>
          {" de "}
          <span className="font-bold text-slate-700">{sortedData.length}</span>
          {" registros"}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="cursor-pointer p-1.5 rounded-control text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e${i}`} className="px-1 text-slate-300 font-mono">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`cursor-pointer min-w-[28px] h-7 px-2 rounded-control text-[11px] font-bold transition-colors ${
                  p === currentPage
                    ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="cursor-pointer p-1.5 rounded-control text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // ── Main render ──

  return (
    <div className={`rounded-control overflow-hidden ${fillViewport ? "flex h-full flex-col min-h-0" : ""} ${containerClassName}`}>
      <div
        className={`overflow-x-hidden ${
          fillViewport ? "flex-1 min-h-0 overflow-y-auto" : maxHeight ? "overflow-y-auto" : ""
        }`}
        style={!fillViewport && maxHeight ? { maxHeight } : undefined}
      >
        {/* table-layout: fixed — sin esto, border-collapse + columnas con
            width fijo (ej. "6.5rem") deja que el navegador calcule el ancho
            de la tabla por contenido en vez de por w-full, y el <thead>
            termina midiendo menos que el contenedor real (visible como un
            corte a la derecha del header). Con fixed, el ancho del
            contenedor se reparte estrictamente entre columnas fijas +
            columnas sin width (que se dividen el resto en partes iguales). */}
        <table className={`w-full text-left text-xs border-collapse table-fixed ${className}`}>
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              {columns.map((col) => (
                  <th
                      key={col.key}
                      className={`
                    py-3 px-4 text-[11px] uppercase tracking-wider whitespace-nowrap
                    ${thAlign(col)}
                    ${stickyHeader ? "sticky top-0 bg-slate-50 z-10" : ""}
                    ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100/50" : ""}
                    ${col.className ?? ""}
                  `}
                      style={col.width ? { width: col.width } : undefined}
                      onClick={() => col.sortable && toggleSort(col.key)}
                      aria-sort={
                        col.sortable
                          ? sortColumn === col.key
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                          : undefined
                      }
                    >
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon column={col} />
                  </span>
                </th>
              ))}
              {onRowClick && (
                <th className="py-3 px-3 w-9" aria-hidden="true">
                  <span className="sr-only">Ver detalle</span>
                </th>
              )}
            </tr>
          </thead>

          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.tbody
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {Array.from({ length: skeletonRowCount }).map((_, r) => (
                  <tr key={r} data-testid="skeleton-row" className="border-b border-border-subtle">
                    {columns.map((col) => (
                      <td key={col.key} className={`py-3.5 px-4 ${tdAlign(col)}`}>
                        <SkeletonBlock
                          className="h-4"
                          style={{ width: col.width ?? (r === 0 && col.key === columns[0]?.key ? "7rem" : "5.5rem") }}
                        />
                      </td>
                    ))}
                    {onRowClick && <td className="py-3.5 px-3 w-9" />}
                  </tr>
                ))}
              </motion.tbody>
            ) : paginatedData.length === 0 ? (
              <motion.tbody
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="divide-y divide-slate-100"
              >
                <tr>
                  <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="py-12 text-center text-slate-400 font-medium italic">
                    {emptyState ?? emptyMessage}
                  </td>
                </tr>
              </motion.tbody>
            ) : (
              <motion.tbody
                key="data"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
                variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
                className="divide-y divide-slate-100"
              >
                {/*
                  Sin `mode="popLayout"`: Motion posiciona los elementos
                  salientes con `position: absolute` mientras animan su exit,
                  pero eso no es válido dentro de un <table> — <tr> no puede
                  posicionarse "absolute" de forma predecible en el modelo de
                  layout de tablas HTML, lo que producía una "estela fantasma"
                  de filas viejas mal superpuestas sobre las nuevas al filtrar
                  rápido. Con el modo por defecto (sync) las filas salientes
                  simplemente se desvanecen en su lugar antes de desmontarse,
                  sin necesitar reposicionamiento.
                */}
                <AnimatePresence initial={false}>
                  {paginatedData.map((row, index) => {
                    const key = rowKey(row, index);
                    const isSelected = selectedRowKey != null && key === selectedRowKey;
                    return (
                      <motion.tr
                        key={key}
                        layout
                        variants={itemVariants}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
                        className={`group ${alternating ? (index % 2 === 0 ? "bg-white" : "bg-slate-50/40") : "bg-white"} ${onRowClick ? `cursor-pointer ${rowHoverClass}` : ""} ${isSelected ? selectedRowClass : ""} transition-colors duration-100`}
                        onClick={() => onRowClick?.(row, index)}
                        onDoubleClick={() => onRowDoubleClick?.(row, index)}
                        tabIndex={onRowClick ? 0 : undefined}
                        onKeyDown={
                          onRowClick
                            ? (e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  onRowClick(row, index);
                                }
                              }
                            : undefined
                        }
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-3.5 px-4 ${tdAlign(col)} ${col.className ?? ""}`}
                            style={col.width ? { width: col.width } : undefined}
                          >
                            {col.render ? (
                              col.render(row, index)
                            ) : (
                              <DefaultCell value={row[col.key as keyof T]} />
                            )}
                          </td>
                        ))}
                        {onRowClick && (
                          <td className="py-3.5 px-3 w-9 text-center">
                            <motion.span
                              className="inline-flex"
                              initial={false}
                              animate={isSelected ? { opacity: 1, x: 0 } : { opacity: 0, x: -3 }}
                              whileHover={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.12 }}
                            >
                              <Eye className={`h-3.5 w-3.5 ${isSelected ? "text-sky-600" : "text-sky-500"}`} aria-hidden="true" />
                            </motion.span>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </motion.tbody>
            )}
          </AnimatePresence>
          {!isLoading && paginatedData.length > 0 && footer && (
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">{footer}</tfoot>
          )}
        </table>
      </div>

      <PaginationBar />
    </div>
  );
}

// ─── Default cell render ───

function DefaultCell({ value }: { value: unknown }) {
  if (value == null || value === "")
    return <span className="text-slate-300 italic font-mono">—</span>;
  return <>{String(value)}</>;
}
