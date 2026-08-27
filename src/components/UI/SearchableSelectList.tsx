/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lista de selección única con búsqueda — extraído del selector de obra de
 * InviteModal (Proveedores). Búsqueda + lista scrolleable de filas
 * clickeables, con una barra lateral animada (`layoutId`, se desliza entre
 * filas) y un check circular con spring confirmando la fila seleccionada —
 * en vez de un <select> nativo o el dropdown de Select.tsx, para flujos
 * donde el usuario necesita ver/filtrar varias opciones a la vez con más
 * contexto por fila (título + subtítulo) que un simple label.
 *
 * Genérico como Table/GridView: no conoce el dominio de `T`, el consumidor
 * decide qué mostrar por fila vía `renderItem` y cómo filtrar vía `getSearchText`.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Search, SearchX } from "lucide-react";
import EmptyState from "./EmptyState";
import { containerVariants, itemVariants, springs } from "../../animations";

interface SearchableSelectListProps<T> {
  items: T[];
  rowKey: (item: T) => string;
  /** Texto contra el que matchea la búsqueda (se concatenan los campos relevantes, ej. `${p.title} ${p.id}`). */
  getSearchText: (item: T) => string;
  /** Contenido de cada fila — recibe si está seleccionada, para poder ajustar el color del texto. */
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  selectedKey: string | null;
  onSelect: (item: T) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  /** Namespace del layoutId de la barra animada — evita colisión si hay más de una instancia en la misma vista. */
  layoutIdNamespace: string;
  emptyMessage: string;
  emptySearchMessage: string;
  /** Sustantivo en singular/plural para el contador (ej. "obra"/"obras"). */
  noun: string;
  nounPlural: string;
  /** Etiqueta corta del ítem seleccionado, mostrada a la derecha del contador (ej. su id). Omitida si no se selecciona nada. */
  selectedLabel?: (item: T) => string;
  className?: string;
  maxHeight?: string;
}

export default function SearchableSelectList<T>({
  items,
  rowKey,
  getSearchText,
  renderItem,
  selectedKey,
  onSelect,
  searchPlaceholder,
  searchAriaLabel,
  layoutIdNamespace,
  emptyMessage,
  emptySearchMessage,
  noun,
  nounPlural,
  selectedLabel,
  className = "",
  maxHeight = "14rem",
}: SearchableSelectListProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q === "" ? items : items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [items, search, getSearchText]);

  const selectedItem = items.find((item) => rowKey(item) === selectedKey) ?? null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          aria-label={searchAriaLabel}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-hidden transition-shadow duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100" style={{ maxHeight }}>
        {filteredItems.length === 0 ? (
          <EmptyState
            message={items.length === 0 ? emptyMessage : emptySearchMessage}
            icon={<SearchX className="h-7 w-7" />}
            className="border-none rounded-none py-8"
          />
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {filteredItems.map((item) => {
              const key = rowKey(item);
              const isSelected = selectedKey === key;
              return (
                <motion.button
                  key={key}
                  variants={itemVariants}
                  type="button"
                  onClick={() => onSelect(item)}
                  transition={springs.snappy}
                  className={`relative w-full cursor-pointer text-left px-4 py-3 transition-colors duration-150 ${
                    isSelected ? "bg-indigo-50/80" : "hover:bg-slate-50"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId={`${layoutIdNamespace}-selected-bar`}
                      className="absolute inset-y-0 left-0 w-1 bg-indigo-500"
                      transition={springs.gentle}
                    />
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">{renderItem(item, isSelected)}</div>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={springs.snappy}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
        <span>{items.length} {items.length !== 1 ? nounPlural : noun} disponible{items.length !== 1 ? "s" : ""}</span>
        <AnimatePresence>
          {selectedItem && selectedLabel && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              className="font-bold text-indigo-500"
            >
              {selectedLabel(selectedItem)} seleccionada
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
