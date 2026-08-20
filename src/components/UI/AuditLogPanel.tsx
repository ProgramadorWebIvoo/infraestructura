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

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, History, Search, SlidersHorizontal } from "lucide-react";
import { SkeletonAuditList } from "../SkeletonLoader";
import EmptyState from "./EmptyState";

export interface AuditLogPanelProps<T> {
  title?: string;
  entries: T[];
  isLoading?: boolean;
  /** Texto a buscar cuando el usuario escribe en el filtro (case-insensitive). Ignorado si `onSearchChange` está controlado desde afuera. */
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
  /**
   * Búsqueda controlada desde afuera (server-side) en vez del filtrado
   * client-side por `searchableText`. Cuando se pasa, el panel deja de
   * filtrar `entries` localmente (asume que ya vienen filtradas del backend)
   * y el input refleja/dispara este valor en vez de su propio estado
   * interno — necesario cuando `entries` es solo la página actual y hay
   * registros que "buscar" pueden estar en otras páginas.
   */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /**
   * Slot de filtros adicionales (selects, rango de fechas, etc.), renderizado
   * debajo del buscador dentro de un acordeón colapsable ("Filtros avanzados")
   * para no saturar el panel angosto por defecto. El conteo de filtros activos
   * (para el badge del toggle) lo calcula el consumidor y lo pasa aparte.
   */
  filtersSlot?: ReactNode;
  /** Cantidad de filtros avanzados activos — se muestra como badge en el toggle "Filtros avanzados". */
  activeFilterCount?: number;
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
  searchValue,
  onSearchChange,
  filtersSlot,
  activeFilterCount = 0,
}: AuditLogPanelProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showFilters, setShowFilters] = useState(false);
  const isSearchControlled = onSearchChange !== undefined;
  const [localSearch, setLocalSearch] = useState("");
  const search = isSearchControlled ? (searchValue ?? "") : localSearch;
  const setSearch = isSearchControlled ? onSearchChange : setLocalSearch;

  // Con búsqueda controlada (server-side), `entries` ya viene filtrada del
  // backend — filtrar de nuevo acá duplicaría el criterio y podría excluir
  // resultados válidos si `searchableText` no cubre los mismos campos que el
  // filtro del servidor (ej. rango de fechas, entityType).
  const filtered = useMemo(() => {
    if (isSearchControlled) return entries;
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => searchableText(e).toLowerCase().includes(q));
  }, [entries, search, searchableText, isSearchControlled]);

  // Detecta cuándo la entrada en el tope de la lista cambió por la llegada de
  // un registro nuevo (prependLocal), para resaltarla brevemente — vs. carga
  // inicial o cambio de página, donde no hay "novedad" que destacar.
  const topKey = filtered.length > 0 ? keyOf(filtered[0]) : null;
  const seenTopKeyRef = useRef<string | number | null>(null);
  const mountedRef = useRef(false);
  const [freshKey, setFreshKey] = useState<string | number | null>(null);

  useEffect(() => {
    // Solo se resalta un cambio de tope cuando no vino de cargar una página
    // (isLoading en tránsito) ni de filtrar por búsqueda — ahí el cambio de
    // "primer elemento visible" no significa que llegó un registro nuevo.
    // Tampoco cuenta la primera vez que `entries` se puebla tras el fetch
    // inicial (seenTopKeyRef todavía no vio ningún tope real).
    if (!mountedRef.current) {
      if (topKey === null) return;
      mountedRef.current = true;
      seenTopKeyRef.current = topKey;
      return;
    }
    if (isLoading || search.trim() !== "") {
      seenTopKeyRef.current = topKey;
      return;
    }
    if (topKey !== null && seenTopKeyRef.current !== null && topKey !== seenTopKeyRef.current) {
      setFreshKey(topKey);
      const timer = setTimeout(() => setFreshKey(null), 2400);
      seenTopKeyRef.current = topKey;
      return () => clearTimeout(timer);
    }
    seenTopKeyRef.current = topKey;
  }, [topKey, isLoading, search]);

  const total = pagination ? pagination.total : entries.length;

  return (
    <motion.div
      animate={{ width: isOpen ? "22.5rem" : "3.75rem" }}
      transition={{ width: { type: "spring", stiffness: 340, damping: 32 } }}
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col shrink-0 ${
        sticky ? "lg:sticky" : ""
      } ${className}`}
      style={{
        ...(sticky ? { top: stickyOffset } : {}),
        ...(fillViewport
          ? {
              height: `calc(100vh - ${stickyOffset} - ${stickyOffset})`,
              maxHeight: `calc(100vh - ${stickyOffset} - ${stickyOffset})`,
            }
          : {}),
      }}
    >
      {isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-expanded={isOpen}
          className="group w-full flex items-center gap-3 p-6 text-left cursor-pointer hover:bg-slate-50/60 transition-colors shrink-0"
        >
          <motion.div
            animate={freshKey !== null ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className={`p-2 rounded-xl border shrink-0 transition-colors duration-500 ease-out ${
              freshKey !== null ? "bg-sky-50 border-sky-200" : "bg-slate-50 border-slate-100"
            }`}
          >
            <History className={`h-4 w-4 transition-colors duration-500 ease-out ${freshKey !== null ? "text-sky-500" : "text-slate-500"}`} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {total} {total === 1 ? "registro" : "registros"}
            </p>
          </div>
          <span className="shrink-0 p-1 rounded-lg text-slate-400 transition-colors duration-200 group-hover:text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-label={`${title} (${total} ${total === 1 ? "registro" : "registros"})`}
          title={title}
          className="w-full h-full flex flex-col items-center pt-4 pb-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
        >
          <motion.div
            animate={freshKey !== null ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className={`p-2 rounded-xl border shrink-0 transition-colors duration-500 ease-out ${
              freshKey !== null ? "bg-sky-50 border-sky-200" : "bg-slate-50 border-slate-100"
            }`}
          >
            <History className={`h-4 w-4 transition-colors duration-500 ease-out ${freshKey !== null ? "text-sky-500" : "text-slate-500"}`} />
          </motion.div>

          <div className="flex-1 min-h-0 flex items-center justify-center py-3">
            <span className="text-[11px] font-bold text-slate-500 tracking-wide [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
              {title}
            </span>
          </div>

          <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-1.5 py-0.5 leading-none shrink-0">
            {total}
          </span>
          <ChevronLeft className="h-3.5 w-3.5 text-slate-400 mt-2 shrink-0" />
        </button>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut", delay: 0.08 } }}
            exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }}
            className={`overflow-hidden border-t border-slate-100 flex flex-col min-h-0 ${fillViewport ? "flex-1" : ""}`}
          >
            <div className="p-4 sm:p-5 space-y-3 flex flex-col min-h-0 h-full">
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1 min-w-0">
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
                {filtersSlot && (
                  <button
                    type="button"
                    onClick={() => setShowFilters(v => !v)}
                    aria-expanded={showFilters}
                    aria-label="Filtros avanzados"
                    className={`relative shrink-0 p-2 rounded-xl border transition-colors cursor-pointer ${
                      showFilters || activeFilterCount > 0
                        ? "border-sky-200 bg-sky-50 text-sky-600"
                        : "border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white leading-none">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {filtersSlot && (
                <AnimatePresence initial={false}>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden shrink-0"
                    >
                      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        {filtersSlot}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {isLoading ? (
                <SkeletonAuditList items={4} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  message={
                    search.trim() || activeFilterCount > 0
                      ? "Sin resultados para esos filtros."
                      : emptyMessage
                  }
                />
              ) : (
                <div className={`space-y-2 pr-1 ${fillViewport ? "overflow-y-auto min-h-0" : "max-h-[420px] overflow-y-auto"}`}>
                  {filtered.map(entry => {
                    const key = keyOf(entry);
                    const isFresh = key === freshKey;
                    return (
                      <motion.div
                        key={key}
                        layout={isOpen}
                        initial={isFresh ? { opacity: 0, y: -10, scale: 0.98 } : false}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          boxShadow: isFresh
                            ? [
                                "0 0 0 0 rgba(56,189,248,0)",
                                "0 0 0 3px rgba(56,189,248,0.3)",
                                "0 0 0 3px rgba(56,189,248,0.3)",
                                "0 0 0 0 rgba(56,189,248,0)",
                              ]
                            : "0 0 0 0 rgba(56,189,248,0)",
                        }}
                        transition={{
                          layout: { type: "spring", stiffness: 380, damping: 32 },
                          opacity: { duration: 0.35, ease: "easeOut" },
                          y: { type: "spring", stiffness: 260, damping: 24 },
                          scale: { type: "spring", stiffness: 260, damping: 24 },
                          boxShadow: { duration: 2.2, ease: "easeInOut", times: [0, 0.15, 0.6, 1] },
                        }}
                        className="rounded-xl"
                      >
                        {renderEntry(entry)}
                      </motion.div>
                    );
                  })}
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
    </motion.div>
  );
}