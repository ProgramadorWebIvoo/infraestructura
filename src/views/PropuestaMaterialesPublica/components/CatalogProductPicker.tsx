/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, ShieldCheck } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { springs } from "@/animations";
import { apiFetch } from "@/services/api";
import type { CatalogProductSearchResult, ItemRow } from "@/views/PropuestaMaterialesPublica/types";

/** Búsqueda remota de producto de catálogo — solo para materiales personalizados. */
export default function CatalogProductPicker({
  item,
  onSelect,
  onQueryChange,
}: {
  item: ItemRow;
  onSelect: (product: CatalogProductSearchResult | null) => void;
  /** Cada vez que el proveedor escribe: así un nombre nuevo (fuera del catálogo) también queda en la fila. */
  onQueryChange?: (query: string) => void;
}) {
  const [query, setQuery] = useState(item.materialName);
  const [results, setResults] = useState<CatalogProductSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const warningColor = SEMANTIC_COLOR_MAP.warning;

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await apiFetch<CatalogProductSearchResult[]>(`/public/catalog-products/search?search=${encodeURIComponent(query.trim())}`);
        setResults(res);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className={`pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${warningColor.icon400}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (item.catalogProductId) onSelect(null);
            onQueryChange?.(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Buscar en catálogo o escribir nombre nuevo *"
          maxLength={220}
          className={`w-full rounded-control border py-2.5 pl-9 pr-3.5 text-sm font-medium text-text-primary outline-hidden transition-shadow duration-150 ${warningColor.border100} focus:${warningColor.text600} focus:ring-1 focus:ring-offset-0`}
        />
      </div>
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={springs.snappy}
            className={`absolute z-20 mt-1 w-full max-h-40 overflow-auto rounded-control border ${warningColor.border100} bg-surface py-1 shadow-md`}
          >
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(p.name);
                    setIsOpen(false);
                    onSelect(p);
                  }}
                  className={`w-full cursor-pointer px-3.5 py-2 text-left text-xs font-medium text-text-primary transition-colors hover:${warningColor.bg50}`}
                >
                  {p.name} <span className="text-text-muted">({p.unit})</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {item.catalogProductId && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${SEMANTIC_COLOR_MAP.success.text700}`}>
          <ShieldCheck className="h-3 w-3" /> Vinculado a catálogo
        </span>
      )}
    </div>
  );
}
