// Generic reusable Table component
// Encapsulates: header styling, loading skeleton, empty state, row hover/alternating,
// footer, scroll containers, sorting, pagination

import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

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
  maxHeight?: string;
  containerClassName?: string;

  // Table element classes
  className?: string;
  stickyHeader?: boolean;

  // Visual overrides
  rowHoverClass?: string;
  /** When true, rows alternate bg-white / bg-slate-50/40 */
  alternating?: boolean;
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
  containerClassName = "",
  className = "",
  stickyHeader = false,
  rowHoverClass = "hover:bg-slate-50/50",
  alternating = true,
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

  const SkeletonRows = () => (
    <tbody>
      {Array.from({ length: skeletonRowCount }).map((_, r) => (
        <tr key={r} className="border-b border-slate-50">
          {columns.map((col) => (
            <td key={col.key} className={`py-3.5 px-4 ${tdAlign(col)}`}>
              <div
                className="animate-pulse bg-slate-200 rounded-xl h-4"
                style={{ width: col.width ?? (r === 0 && col.key === columns[0]?.key ? "7rem" : "5.5rem") }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

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
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30 text-xs">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
                className={`min-w-[28px] h-7 px-2 rounded-lg text-[11px] font-bold transition-colors ${
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
    <div className={containerClassName}>
      <div
        className={`overflow-x-auto ${maxHeight ? "overflow-y-auto" : ""}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className={`w-full text-left text-xs border-collapse ${className}`}>
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    py-3 px-4 text-[10px] uppercase tracking-wider whitespace-nowrap
                    ${thAlign(col)}
                    ${stickyHeader ? "sticky top-0 bg-slate-50 z-10" : ""}
                    ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100/50" : ""}
                    ${col.className ?? ""}
                  `}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon column={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {isLoading ? (
            <SkeletonRows />
          ) : (
            <>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-medium italic">
                      {emptyState ?? emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={rowKey(row, index)}
                      className={`transition-colors ${alternating ? (index % 2 === 0 ? "bg-white" : "bg-slate-50/40") : "bg-white"} ${rowHoverClass}`}
                      style={{ contentVisibility: "auto" }}
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
                    </tr>
                  ))
                )}
              </tbody>
              {footer && <tfoot className="bg-slate-50 font-bold border-t border-slate-200">{footer}</tfoot>}
            </>
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
