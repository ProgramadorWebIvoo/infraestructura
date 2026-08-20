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
import { SearchInput, SelectFilter, type SelectOption } from "./FilterBar";
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
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border-subtle bg-surface-sunken/60 p-5 md:flex-row md:items-center md:justify-between">
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
      </div>
    </div>
  );
}
