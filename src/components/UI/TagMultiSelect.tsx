/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector múltiple de opciones fijas, mostrado como chips/tags — reemplaza
 * a un <select multiple> o textarea JSON crudo, que son mala experiencia
 * para elegir entre una lista conocida de opciones. Cada opción disponible
 * es un chip clickeable que alterna seleccionado/no seleccionado; incluye
 * "Seleccionar todos" / "Ninguno" para catálogos largos.
 *
 * Para catálogos largos (más de `SEARCH_THRESHOLD` opciones) agrega un buscador
 * por label — sin él, encontrar un chip puntual entre ~35 opciones desordenadas
 * requiere leer toda la nube de tags.
 *
 * `value`/`onChange` operan sobre el string técnico (`option.value`) — el
 * que efectivamente se persiste — mientras que `option.label` es solo el
 * texto legible mostrado en el chip. Para catálogos donde ambos coinciden,
 * basta con pasar `label` igual a `value`.
 */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SEMANTIC_COLOR_MAP } from "./colorTokens";

export interface TagOption {
  value: string;
  label: string;
}

interface TagMultiSelectProps {
  options: TagOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/** A partir de esta cantidad de opciones, un buscador por label rinde más que escanear la nube de chips a ojo. */
const SEARCH_THRESHOLD = 8;

export default function TagMultiSelect({ options, value, onChange, disabled = false, className = "" }: TagMultiSelectProps) {
  const [search, setSearch] = useState("");
  const brand = SEMANTIC_COLOR_MAP.brand;
  const neutral = SEMANTIC_COLOR_MAP.neutral;

  const toggle = (optionValue: string) => {
    if (disabled) return;
    onChange(value.includes(optionValue) ? value.filter(v => v !== optionValue) : [...value, optionValue]);
  };

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const showSearch = options.length > SEARCH_THRESHOLD;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-text-muted">
          {value.length} de {options.length} seleccionadas
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(options.map(o => o.value))}
            className={`text-[11px] font-bold ${brand.text600} hover:${brand.text700} disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
          >
            Seleccionar todas
          </button>
          <span className="text-border-default">|</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="text-[11px] font-bold text-text-muted hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Ninguna
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="relative mb-2">
          <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={disabled}
            placeholder="Buscar..."
            aria-label="Buscar opción"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-control border border-border-default bg-surface-base placeholder-text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {filteredOptions.length === 0 ? (
        <p className="text-[11px] text-text-muted py-1.5">Sin resultados para esa búsqueda.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-0.5">
          {filteredOptions.map(option => {
            const selected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => toggle(option.value)}
                className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "bg-brand-600 border-brand-600 text-white hover:bg-brand-700"
                    : `bg-surface-base ${neutral.border100} text-text-tertiary hover:border-brand-300 hover:text-brand-600`
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
