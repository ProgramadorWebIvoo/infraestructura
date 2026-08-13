/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector múltiple de opciones fijas, mostrado como chips/tags — reemplaza
 * a un <select multiple> o textarea JSON crudo, que son mala experiencia
 * para elegir entre una lista conocida de opciones. Cada opción disponible
 * es un chip clickeable que alterna seleccionado/no seleccionado; incluye
 * "Seleccionar todos" / "Ninguno" para catálogos largos.
 */

interface TagMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export default function TagMultiSelect({ options, value, onChange, disabled = false, className = "" }: TagMultiSelectProps) {
  const toggle = (option: string) => {
    if (disabled) return;
    onChange(value.includes(option) ? value.filter(v => v !== option) : [...value, option]);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-400">
          {value.length} de {options.length} seleccionadas
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(options)}
            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Seleccionar todas
          </button>
          <span className="text-slate-200">|</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Ninguna
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {options.map(option => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "bg-sky-600 border-sky-600 text-white hover:bg-sky-700"
                  : "bg-white border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
