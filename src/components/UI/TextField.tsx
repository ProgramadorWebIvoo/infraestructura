/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Campo de texto (input/textarea) con label, error y contador de caracteres
 * integrados — fuente única para el patrón label+control que antes se
 * repetía a mano en cada formulario. Mismo vocabulario de `accent` que
 * NumericInput (SemanticColor), y reusa FieldError/fieldErrorClasses en vez
 * de reimplementar la animación/estilo de error. `required` se refleja como
 * RequiredMark (indicador dinámico) + `aria-required` — deliberadamente NO
 * como el atributo HTML `required` nativo, que dispararía la validación
 * incorporada del navegador (tooltip nativo + bloqueo silencioso del
 * submit del <form>) en vez de dejar que la validación la controle React
 * vía la prop `error`, que es la única fuente de verdad en toda la app.
 */

import type { ReactNode } from "react";
import { FOCUS_RING_CLASSES, type SemanticColor } from "./colorTokens";
import FieldError, { fieldErrorClasses } from "./FieldError";
import { RequiredMark } from "./HintSignals";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: "input" | "textarea";
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  showCounter?: boolean;
  accent?: SemanticColor;
  icon?: ReactNode;
  className?: string;
}

export default function TextField({
  id,
  label,
  value,
  onChange,
  as = "input",
  placeholder,
  error,
  required = false,
  disabled = false,
  rows = 3,
  maxLength,
  showCounter = false,
  accent = "brand",
  icon,
  className = "",
}: TextFieldProps) {
  const controlClassName = `w-full text-xs px-3.5 ${as === "textarea" ? "py-3" : "py-2.5"} ${
    icon ? "pl-10" : ""
  } rounded-lg border border-slate-200 bg-white font-bold text-slate-800 outline-hidden focus:ring-2 ${
    FOCUS_RING_CLASSES[accent]
  } ${fieldErrorClasses(!!error)} ${className}`;

  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
        {required && <RequiredMark filled={value.trim().length > 0} />}
      </label>
      <div className={icon ? "relative" : undefined}>
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        {as === "textarea" ? (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-required={required}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            aria-invalid={!!error}
            className={`${controlClassName} font-medium resize-none`}
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-required={required}
            disabled={disabled}
            maxLength={maxLength}
            aria-invalid={!!error}
            className={controlClassName}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <FieldError message={error} />
        {showCounter && maxLength && (
          <span className="shrink-0 text-[10px] font-medium text-slate-400 mt-1">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
