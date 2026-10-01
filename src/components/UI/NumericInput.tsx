/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Input numérico seguro: previene notación científica ('e'/'E') y valores negativos.
 * Sanea onChange, onKeyDown y onPaste automáticamente.
 * El estado externo debe ser `number | ""`.
 *
 * Con `thousands` muestra el valor con separador de miles mientras se escribe
 * (1,250,000.50). El estado externo sigue siendo el número crudo.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FOCUS_RING_CLASSES, type SemanticColor } from "./colorTokens";

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
  /** Color de foco/acento. Default "brand" (celeste), el histórico de este campo. */
  accent?: SemanticColor;
  id?: string;
  disabled?: boolean;
  /** Muestra separador de miles al escribir (para montos). Apagado por defecto. */
  thousands?: boolean;
  /** Decimales máximos en modo `thousands` (ignorado si `integer`). Default 2. */
  decimals?: number;
}

const BASE_CLASSES =
  "w-full text-xs px-3.5 py-3 rounded-control border border-border-default outline-hidden focus:ring-2 bg-surface font-mono font-bold text-text-secondary disabled:opacity-60 disabled:cursor-not-allowed";

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Texto mostrado para un valor ya confirmado (sin ceros de relleno). */
function formatValue(value: number | "", maxDecimals: number): string {
  if (value === "") return "";
  return value.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

/** Valor numérico que representa el texto mostrado ("1,250." → 1250). */
function parseDisplay(text: string): number | "" {
  const parsed = parseFloat(text.replace(/,/g, ""));
  return Number.isNaN(parsed) ? "" : parsed;
}

/** Cuenta los caracteres significativos (dígitos, punto, signo) antes de `caret`. */
const significantBefore = (text: string, caret: number) => text.slice(0, caret).replace(/[^0-9.-]/g, "").length;

function ThousandsInput({
  value,
  onChange,
  className = "",
  placeholder = "0.00",
  max,
  allowNegative = false,
  integer = false,
  accent = "brand",
  id,
  disabled = false,
  decimals = 2,
}: Omit<NumericInputProps, "thousands" | "step" | "min">) {
  const maxDecimals = integer ? 0 : decimals;
  const [display, setDisplay] = useState(() => formatValue(value, maxDecimals));
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // Si el padre cambia el valor por otra vía (reset, carga), el texto lo sigue;
  // mientras escribimos ("1.", "0.50") se conserva lo tecleado.
  useEffect(() => {
    setDisplay((prev) => (parseDisplay(prev) === value ? prev : formatValue(value, maxDecimals)));
  }, [value, maxDecimals]);

  // Reposiciona el cursor tras reformatear: las comas insertadas lo empujarían al final.
  useLayoutEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;
    let seen = 0;
    let caret = display.length;
    for (let i = 0; i < display.length; i++) {
      if (seen === pendingCaret.current) {
        caret = i;
        break;
      }
      if (/[0-9.-]/.test(display[i])) seen++;
    }
    inputRef.current.setSelectionRange(caret, caret);
    pendingCaret.current = null;
  }, [display]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value.replace(/[eE]/g, "");
    const negative = allowNegative && typed.trimStart().startsWith("-");
    const cleaned = typed.replace(/[^0-9.]/g, "");

    if (cleaned === "") {
      setDisplay(negative ? "-" : "");
      onChange("");
      return;
    }

    const [rawInt, ...rest] = cleaned.split(".");
    const intPart = rawInt.replace(/^0+(?=\d)/, "") || "0";
    const hasDot = maxDecimals > 0 && cleaned.includes(".");
    const decPart = rest.join("").slice(0, maxDecimals);

    let number = parseFloat(`${intPart}${hasDot ? `.${decPart}` : ""}`);
    if (negative) number = -number;

    if (max !== undefined && number > max) {
      setDisplay(formatValue(max, maxDecimals));
      onChange(max);
      return;
    }

    const shown = `${negative ? "-" : ""}${groupThousands(intPart)}${hasDot ? `.${decPart}` : ""}`;
    pendingCaret.current = significantBefore(e.target.value, e.target.selectionStart ?? e.target.value.length);
    setDisplay(shown);
    onChange(number);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "e" || e.key === "E" || e.key === "Subtract") e.preventDefault();
    if (!allowNegative && e.key === "-") e.preventDefault();
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={() => setDisplay(formatValue(value, maxDecimals))}
      placeholder={placeholder}
      disabled={disabled}
      className={`${BASE_CLASSES} ${FOCUS_RING_CLASSES[accent]} ${className}`}
    />
  );
}

export default function NumericInput(props: NumericInputProps) {
  const { thousands = false, decimals, ...rest } = props;
  if (thousands) return <ThousandsInput {...rest} decimals={decimals} />;
  return <PlainNumericInput {...rest} />;
}

function PlainNumericInput({
  value,
  onChange,
  className = "",
  placeholder = "0.00",
  step = "0.01",
  min = 0,
  max,
  allowNegative = false,
  integer = false,
  accent = "brand",
  id,
  disabled = false,
}: Omit<NumericInputProps, "thousands" | "decimals">) {
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
      disabled={disabled}
      className={`${BASE_CLASSES} ${FOCUS_RING_CLASSES[accent]} ${className}`}
    />
  );
}
