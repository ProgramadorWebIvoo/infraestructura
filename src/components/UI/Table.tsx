// Generic reusable Table component
// Encapsulates: header styling, loading skeleton, empty state, row hover/alternating,
// footer, scroll containers, sorting, pagination

import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
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
  rowHoverClass = "hover:bg-slate-50/50",
  alternating = true,
  onRowClick,
  onRowDoubleClick,
  selectedRowKey,
  selectedRowClass = "bg-sky-50 ring-1 ring-sky-200",
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const paginationEnabled = pageSize != null && pageSize > 0;
  const limit = paginationEnabled ? pageSize! : data.length;

  // ── Sorting ──

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn as keyof T];
      const bVal = b[sortColumn as keyof T];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp =
        typeof aVal === "string" && typeof bVal === "string"
          ? aVal.localeCompare(bVal)
          : Number(aVal) - Number(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortColumn, sortDir]);

  // ── Pagination ──

  const totalPages = paginationEnabled ? Math.max(1, Math.ceil(sortedData.length / limit)) : 1;

  // Sync currentPage when totalPages shrinks (e.g. after filtering)
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
    <div className={`${fillViewport ? "flex h-full flex-col min-h-0" : ""} ${containerClassName}`}>
      <div
        className={`overflow-x-auto ${
          fillViewport ? "flex-1 min-h-0 overflow-y-auto" : maxHeight ? "overflow-y-auto" : ""
        }`}
        style={!fillViewport && maxHeight ? { maxHeight } : undefined}
      >
        <table className={`w-full text-left text-xs border-collapse ${className}`}>
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
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-medium italic">
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
                        className={`${alternating ? (index % 2 === 0 ? "bg-white" : "bg-slate-50/40") : "bg-white"} ${rowHoverClass} ${onRowClick ? "cursor-pointer" : ""} ${isSelected ? selectedRowClass : ""}`}
                        onClick={() => onRowClick?.(row, index)}
                        onDoubleClick={() => onRowDoubleClick?.(row, index)}
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
