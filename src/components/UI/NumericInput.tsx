/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Input numérico seguro: previene notación científica ('e'/'E') y valores negativos.
 * Sanea onChange, onKeyDown y onPaste automáticamente.
 * El estado externo debe ser `number | ""`.
 */

import { useCallback } from "react";

interface NumericInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  className?: string;
  placeholder?: string;
  step?: string;
  min?: number;
  /** Si se define, clampa cualquier valor ingresado o pegado a este tope. */
  max?: number;
  /** Deshabilitar sanetización de negativos (por defecto se bloquean) */
  allowNegative?: boolean;
  /** Forzar valores enteros (sin decimales). Útil para semanas, cantidades, etc. */
  integer?: boolean;
  id?: string;
}

export default function NumericInput({
  value,
  onChange,
  className = "",
  placeholder = "0.00",
  step = "0.01",
  min = 0,
  max,
  allowNegative = false,
  integer = false,
  id,
}: NumericInputProps) {
  const sanitize = useCallback(
    (raw: string) => {
      const v = raw.replace(/[eE]/g, "");
      if (v === "") return "" as const;
      const parsed = integer ? parseInt(v, 10) : parseFloat(v);
      if (isNaN(parsed)) return value; // mantener valor anterior
      if (!allowNegative && parsed < 0) return 0;
      if (max !== undefined && parsed > max) return max;
      return parsed;
    },
    [allowNegative, integer, max, value],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(sanitize(e.target.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "e" || e.key === "E" || e.key === "Subtract") {
      e.preventDefault();
    }
    if (!allowNegative && (e.key === "-" || e.key === "Subtract")) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/[eE]/g, "");
    onChange(sanitize(text));
  };

  return (
    <input
      id={id}
      type="number"
      step={integer ? "1" : step}
      min={min}
      max={max}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      className={`w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white font-mono font-bold ${className}`}
    />
  );
}
