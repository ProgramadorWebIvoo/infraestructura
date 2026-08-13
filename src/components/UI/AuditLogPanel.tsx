/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel lateral de auditoría reutilizable: colapsable, con búsqueda, pensado
 * para vistas de configuración (CONFIG APP, config de IA, proveedores, etc.)
 * donde se necesita mostrar "quién cambió qué y cuándo" sin ocupar espacio
 * permanente. En desktop se ancla a la derecha; en mobile se apila debajo
 * del contenido principal y ocupa el ancho completo.
 *
 * `sticky` + `fillViewport` reproducen el patrón Odoo: el panel se queda fijo
 * en pantalla al hacer scroll del contenido principal (no se pierde de
 * vista), ocupando la altura visible del viewport en vez de expandirse con su
 * propio contenido — el scroll queda contenido adentro, sin dejar huecos en
 * blanco cuando hay pocos registros ni forzar la página a crecer cuando hay
 * muchos.
 */

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, History, Search } from "lucide-react";
import Spinner from "./Spinner";
import EmptyState from "./EmptyState";

export interface AuditLogPanelProps<T> {
  title?: string;
  entries: T[];
  isLoading?: boolean;
  /** Texto a buscar cuando el usuario escribe en el filtro (case-insensitive). */
  searchableText: (entry: T) => string;
  /** Renderiza una entrada individual. */
  renderEntry: (entry: T) => ReactNode;
  keyOf: (entry: T) => string | number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  defaultOpen?: boolean;
  /** Ancla el panel en su posición al hacer scroll del contenido principal (desktop). */
  sticky?: boolean;
  /** `top` del panel cuando `sticky` está activo (debe dejar espacio para headers fijos). */
  stickyOffset?: string;
  /** Ocupa la altura visible del viewport (con `stickyOffset` restado) en vez de crecer con el contenido; el listado interno hace su propio scroll. */
  fillViewport?: boolean;
  className?: string;
  /**
   * Paginación server-side (opcional). `entries` debe contener solo la
   * página actual — con volúmenes de auditoría que crecen indefinidamente,
   * traer todo de una vez no escala. Si se omite, el panel se comporta como
   * lista simple (todo lo que venga en `entries`).
   */
  pagination?: {
    page: number;
    lastPage: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export default function AuditLogPanel<T>({
  title = "Historial de cambios",
  entries,
  isLoading = false,
  searchableText,
  renderEntry,
  keyOf,
  searchPlaceholder = "Buscar en el historial...",
  emptyMessage = "Sin registros de auditoría todavía.",
  defaultOpen = false,
  sticky = false,
  stickyOffset = "1.5rem",
  fillViewport = false,
  className = "",
  pagination,
}: AuditLogPanelProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => searchableText(e).toLowerCase().includes(q));
  }, [entries, search, searchableText]);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col ${
        sticky ? "lg:sticky" : ""
      } ${className}`}
      style={{
        ...(sticky ? { top: stickyOffset } : {}),
        ...(fillViewport
          ? {
              height: isOpen ? `calc(100vh - ${stickyOffset} - ${stickyOffset})` : undefined,
              maxHeight: `calc(100vh - ${stickyOffset} - ${stickyOffset})`,
            }
          : {}),
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-50/60 transition-colors shrink-0"
      >
        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
          <History className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {pagination ? pagination.total : entries.length}{" "}
            {(pagination ? pagination.total : entries.length) === 1 ? "registro" : "registros"}
          </p>
        </div>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: fillViewport ? "100%" : "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`overflow-hidden border-t border-slate-100 flex flex-col min-h-0 ${fillViewport ? "flex-1" : ""}`}
          >
            <div className="p-4 sm:p-5 space-y-3 flex flex-col min-h-0 h-full">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-medium text-slate-700"
                />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner size="lg" />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState message={entries.length === 0 ? emptyMessage : "Sin resultados para esa búsqueda."} />
              ) : (
                <div className={`space-y-2 pr-1 ${fillViewport ? "overflow-y-auto min-h-0" : "max-h-[420px] overflow-y-auto"}`}>
                  {filtered.map(entry => (
                    <div key={keyOf(entry)}>{renderEntry(entry)}</div>
                  ))}
                </div>
              )}

              {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || isLoading}
                    aria-label="Página anterior"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Página {pagination.page} de {pagination.lastPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.lastPage || isLoading}
                    aria-label="Página siguiente"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}