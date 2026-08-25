/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barra de herramientas para tablas de configuración: búsqueda + filtro
 * opcional + chip contador animado. Extraída de la duplicación idéntica
 * entre UsuariosPanel, ProveedoresConfigPanel y MaterialConfigPanel.
 */

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Table as TableIcon, LayoutGrid } from "lucide-react";
import { SearchInput, SelectFilter, type SelectOption } from "./FilterBar";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";
import { springs } from "../../animations";

interface TableToolbarProps {
  searchId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  /** Filtro adicional (ej. por estado). Omitido si la vista no lo necesita. */
  filter?: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    options: SelectOption[];
  };
  /** Ícono del chip contador (ej. <Users className="h-4 w-4" />). */
  countIcon: ReactNode;
  filteredCount: number;
  totalCount: number;
  /** Sustantivo en singular/plural (ej. "usuario"/"usuarios"). */
  noun: string;
  nounPlural: string;
  /**
   * Toggle Tabla/Grid opcional — omitido, el toolbar se ve exactamente igual
   * que antes (UsuariosPanel/MaterialConfigPanel/ProveedoresConfigPanel no
   * lo pasan). Cuando se pasa, renderiza los 2 botones de alternar vista,
   * mismo componente que antes cada vista con GridView reimplementaba a
   * mano — ver useTableViewMode (src/hooks/) para el estado ya resuelto.
   */
  viewToggle?: {
    value: "table" | "grid";
    onChange: (mode: "table" | "grid") => void;
    accent?: SemanticColor;
  };
}

export default function TableToolbar({
  searchId,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filter,
  countIcon,
  filteredCount,
  totalCount,
  noun,
  nounPlural,
  viewToggle,
}: TableToolbarProps) {
  const toggleAccent = SEMANTIC_COLOR_MAP[viewToggle?.accent ?? "brand"];

  return (
    <div className="flex shrink-0 flex-col gap-4 border-b border-border-subtle bg-surface-sunken/60 p-5 md:flex-row md:items-center md:justify-between">
      <SearchInput
        id={searchId}
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        ariaLabel={searchAriaLabel}
        className="md:w-96"
      />
      <div className="flex items-center gap-2">
        {filter && (
          <SelectFilter
            id={filter.id}
            value={filter.value}
            onChange={filter.onChange}
            ariaLabel={filter.ariaLabel}
            options={filter.options}
          />
        )}
        <div className="flex items-center gap-1.5 rounded-control border border-border-default bg-surface px-4 py-2.5 text-xs font-bold text-text-secondary shrink-0">
          <span className="text-text-muted [&>svg]:h-4 [&>svg]:w-4">{countIcon}</span>
          <motion.span
            key={filteredCount}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springs.snappy}
            className="text-text-primary"
          >
            {filteredCount}{filteredCount !== totalCount ? ` / ${totalCount}` : ""}
          </motion.span>
          {filteredCount === 1 ? noun : nounPlural}
        </div>
        {viewToggle && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/60 shrink-0">
            <button
              type="button"
              onClick={() => viewToggle.onChange("table")}
              aria-label="Vista de tabla"
              aria-pressed={viewToggle.value === "table"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewToggle.value === "table" ? `bg-white ${toggleAccent.text700} shadow-sm` : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => viewToggle.onChange("grid")}
              aria-label="Vista de grid"
              aria-pressed={viewToggle.value === "grid"}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewToggle.value === "grid" ? `bg-white ${toggleAccent.text700} shadow-sm` : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
