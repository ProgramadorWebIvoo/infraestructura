// Tabla compacta para listas largas de productos/partidas (hasta ~70+ líneas).
// Paginada, con buscador y filtros rápidos, cabecera fija y resumen siempre visible.
//
// A diferencia de `Table`, está pensada para filas EDITABLES: la página actual
// NO se reinicia cuando cambia `items` (cada tecla en un precio crea un array
// nuevo), solo cuando cambia el buscador o el filtro. A `render` se le pasa el
// índice original en `items`, que es lo que necesitan los updaters del padre.

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { PaginationBar } from "./Table";

export interface ProductColumn<T> {
  key: string;
  label: ReactNode;
  align?: "left" | "center" | "right";
  /** Ancho CSS de la columna (ej. "6rem"). Sin ancho, se reparte el resto. */
  width?: string;
  className?: string;
  /** `index` es la posición original de la fila en `items` (no en la página). */
  render: (row: T, index: number) => ReactNode;
}

export interface ProductFilter<T> {
  key: string;
  label: string;
  predicate: (row: T) => boolean;
}

export interface ProductLinesTableProps<T> {
  items: T[];
  columns: ProductColumn<T>[];
  rowKey: (row: T, index: number) => string | number;
  /** Texto en el que busca el buscador. Sin esto, no se muestra el buscador. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Filtros rápidos (ej. "Faltan datos"). Siempre existe "Todos" primero. */
  filters?: ProductFilter<T>[];
  /** Filas por página. Default 15. */
  pageSize?: number;
  /** Alto máximo del área de filas antes de hacer scroll. Default "28rem". */
  maxHeight?: string;
  /** Resumen fijo bajo las filas (ej. total de materiales); no se pagina. */
  summary?: ReactNode;
  /** Acciones a la derecha del buscador (ej. "Agregar material"). */
  toolbarActions?: ReactNode;
  rowClassName?: (row: T, index: number) => string;
  emptyMessage?: string;
  /** "dark" para las páginas públicas sobre fondo oscuro. Default "light". */
  tone?: "light" | "dark";
  /** Describe la tabla a lectores de pantalla. */
  ariaLabel: string;
}

const TONES = {
  light: {
    wrapper: "rounded-lg border border-slate-200 bg-white",
    toolbar: "border-slate-100 bg-slate-50/60",
    input: "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:border-brand-400",
    icon: "text-slate-400",
    chip: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    chipOn: "border-brand-300 bg-brand-50 text-brand-700",
    thead: "bg-slate-50 text-slate-400 border-slate-100",
    divide: "divide-slate-100",
    summary: "border-slate-200 bg-slate-50",
    empty: "text-slate-400",
  },
  dark: {
    wrapper: "rounded-lg border border-white/10 bg-white/[0.03]",
    toolbar: "border-white/10 bg-white/5",
    input: "border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500 focus:border-amber-400/60",
    icon: "text-slate-500",
    chip: "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
    chipOn: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    thead: "bg-slate-950 text-slate-500 border-white/10",
    divide: "divide-white/5",
    summary: "border-white/10 bg-white/5",
    empty: "text-slate-500",
  },
} as const;

const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

export default function ProductLinesTable<T>({
  items,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = "Buscar producto…",
  filters = [],
  pageSize = 15,
  maxHeight = "28rem",
  summary,
  toolbarActions,
  rowClassName,
  emptyMessage = "No hay productos que coincidan.",
  tone = "light",
  ariaLabel,
}: ProductLinesTableProps<T>) {
  const t = TONES[tone];
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  // El buscador filtra con un valor diferido: escribir no bloquea al re-filtrar 70+ filas.
  const deferredQuery = useDeferredValue(query);

  const entries = useMemo(() => items.map((row, index) => ({ row, index })), [items]);

  const filtered = useMemo(() => {
    const filter = filters.find((f) => f.key === activeFilter);
    const q = normalize(deferredQuery.trim());
    return entries.filter(({ row }) => {
      if (filter && !filter.predicate(row)) return false;
      if (q && searchText && !normalize(searchText(row)).includes(q)) return false;
      return true;
    });
    // `filters` y `searchText` suelen declararse inline en el padre (identidad nueva en cada
    // render), por eso no están en las dependencias: deben ser funciones puras de la fila.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, activeFilter, deferredQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  // Buscar o cambiar de filtro vuelve a la primera página; editar filas, no.
  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const updateFilter = (key: string | null) => {
    setActiveFilter(key);
    setPage(1);
  };

  // Si el padre agrega una línea (ej. "Agregar material"), se muestra: se limpian
  // buscador/filtro y se va a la última página, donde queda la fila nueva.
  const previousLength = useRef(items.length);
  useEffect(() => {
    if (items.length > previousLength.current) {
      setQuery("");
      setActiveFilter(null);
      setPage(Math.max(1, Math.ceil(items.length / pageSize)));
    }
    previousLength.current = items.length;
  }, [items.length, pageSize]);

  const visible = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  const counts = useMemo(() => Object.fromEntries(filters.map((f) => [f.key, items.filter(f.predicate).length])), [filters, items]);

  const showToolbar = Boolean(searchText) || filters.length > 0 || Boolean(toolbarActions);
  const isFiltering = deferredQuery.trim() !== "" || activeFilter !== null;

  return (
    <div className={`overflow-hidden ${t.wrapper}`}>
      {showToolbar && (
        <div className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${t.toolbar}`}>
          {searchText && (
            <div className="relative min-w-40 flex-1">
              <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${t.icon}`} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className={`w-full rounded-lg border py-1.5 pl-8 pr-7 text-xs font-medium outline-hidden transition ${t.input}`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  aria-label="Limpiar búsqueda"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer ${t.icon}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros">
              {[{ key: null as string | null, label: "Todos", count: items.length }, ...filters.map((f) => ({ key: f.key as string | null, label: f.label, count: counts[f.key] }))].map(
                (chip) => (
                  <button
                    key={chip.key ?? "all"}
                    type="button"
                    aria-pressed={activeFilter === chip.key}
                    onClick={() => updateFilter(chip.key)}
                    className={`cursor-pointer rounded-pill border px-2.5 py-1 text-[10px] font-bold transition-colors ${activeFilter === chip.key ? t.chipOn : t.chip}`}
                  >
                    {chip.label} <span className="font-mono opacity-70">{chip.count}</span>
                  </button>
                ),
              )}
            </div>
          )}

          {toolbarActions && <div className="ml-auto flex items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-left" aria-label={ariaLabel}>
          <thead className="sticky top-0 z-10">
            <tr className={`border-b text-[8px] font-bold uppercase tracking-wider ${t.thead}`}>
              {columns.map((col) => (
                <th key={col.key} className={`px-3 py-2 ${ALIGN[col.align ?? "left"]} ${col.className ?? ""}`} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${t.divide}`}>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`px-3 py-6 text-center text-[11px] italic ${t.empty}`}>
                  {isFiltering ? emptyMessage : "Sin productos."}
                </td>
              </tr>
            ) : (
              visible.map(({ row, index }) => (
                <tr key={rowKey(row, index)} className={rowClassName?.(row, index) ?? ""}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2 align-middle ${ALIGN[col.align ?? "left"]} ${col.className ?? ""}`}>
                      {col.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {summary && <div className={`border-t-2 px-3 py-2 ${t.summary}`}>{summary}</div>}

      <PaginationBar
        paginationEnabled
        totalItems={filtered.length}
        totalPages={totalPages}
        currentPage={currentPage}
        fromItem={(currentPage - 1) * pageSize + 1}
        toItem={Math.min(currentPage * pageSize, filtered.length)}
        onGoToPage={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
        tone={tone}
      />
    </div>
  );
}
