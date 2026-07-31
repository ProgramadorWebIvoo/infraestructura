/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controles de filtrado reutilizables (search + selects), extraídos del
 * patrón duplicado entre AuditLogSection y MasterTableSection de Presidencia.
 */

import { Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

const INPUT_CLASS =
  "px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-bold cursor-pointer";

interface SearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}

export function SearchInput({ id, value, onChange, placeholder, ariaLabel, className = "" }: SearchInputProps) {
  return (
    <div className={`relative flex-1 min-w-[200px] ${className}`}>
      <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="pl-10 pr-3.5 py-2 w-full text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold text-slate-700"
      />
    </div>
  );
}

interface SelectFilterProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  options: SelectOption[];
  title?: string;
  className?: string;
}

export function SelectFilter({ id, value, onChange, ariaLabel, options, title, className = "" }: SelectFilterProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      title={title}
      className={`${INPUT_CLASS} ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
