/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de hora TRUE VALUE (mismo enfoque que DatePicker.tsx): dos
 * columnas scrolleables (hora 00-23 / minutos en pasos de 5) en vez de
 * `<input type="time">` nativo, para que el picker siga el diseño de la app
 * en vez de caer al estilo del navegador/SO.
 *
 * API pública: value/onChange sobre string "HH:MM" en 24h — mismo formato
 * que exige el backend (`AppSettingController::assertCronHourFormat`,
 * regex `^([01]\d|2[0-3]):[0-5]\d$`), así el consumidor no necesita convertir
 * nada. Se muestra en 24h (no 12h/AM-PM) a propósito: es el mismo valor que
 * se persiste, sin ambigüedad ni conversión visual que pueda desalinearse
 * del dato real — relevante porque este valor alimenta directamente
 * `Schedule::dailyAt()` en el backend.
 *
 * Validación fuerte de `value`: solo un HH:MM que matchea el mismo patrón
 * que el backend se considera seleccionado — un valor externo inválido o a
 * medio escribir no rompe el componente, simplemente no resalta nada
 * todavía (mismo criterio que DatePicker con una fecha inválida).
 */

import { type KeyboardEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Clock } from "lucide-react";
import type { SemanticColor } from "./colorTokens";
import { FOCUS_RING_CLASSES } from "./colorTokens";
import { fieldErrorClasses } from "./FieldError";
import { springs } from "@/animations";

interface TimeInputProps {
  /** "HH:MM" en 24h, o "" si no hay valor. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  accent?: SemanticColor;
  size?: "sm" | "md";
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Paso de la columna de minutos — 5 por defecto (00, 05, 10, ... 55). */
  minuteStep?: 1 | 5 | 10 | 15 | 30;
}

const SIZE_CLASSES: Record<NonNullable<TimeInputProps["size"]>, string> = {
  sm: "py-1.5 pl-8 pr-3 text-[11px]",
  md: "py-2.5 pl-10 pr-3.5 text-xs",
};

const ACCENT_BG_CLASSES: Record<SemanticColor, string> = {
  brand: "bg-brand-600",
  success: "bg-success-600",
  danger: "bg-danger-600",
  warning: "bg-warning-600",
  info: "bg-info-600",
  neutral: "bg-neutral-600",
};

const ACCENT_HOVER_BG_CLASSES: Record<SemanticColor, string> = {
  brand: "hover:bg-brand-50",
  success: "hover:bg-success-50",
  danger: "hover:bg-danger-50",
  warning: "hover:bg-warning-50",
  info: "hover:bg-info-50",
  neutral: "hover:bg-neutral-50",
};

const ACCENT_HOVER_BORDER_CLASSES: Record<SemanticColor, string> = {
  brand: "hover:border-brand-200",
  success: "hover:border-success-200",
  danger: "hover:border-danger-200",
  warning: "hover:border-warning-200",
  info: "hover:border-info-200",
  neutral: "hover:border-neutral-200",
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parsea "HH:MM" solo si matchea EXACTAMENTE el mismo patrón que valida el backend — ver AppSettingController::assertCronHourFormat. */
function parseTime(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export default function TimeInput({
  value,
  onChange,
  id,
  accent = "info",
  size = "md",
  hasError = false,
  disabled = false,
  required = false,
  placeholder = "Seleccionar hora",
  ariaLabel,
  className = "",
  minuteStep = 5,
}: TimeInputProps) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const isValid = parsed !== null;

  const [isOpen, setIsOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const leftPadding = size === "sm" ? "pl-8" : "pl-10";

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep), [minuteStep]);

  const close = useCallback(() => setIsOpen(false), []);

  const updatePanelRect = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelRect({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePanelRect();
    // Centrar la hora/minuto seleccionados (o el valor actual redondeado) en su columna al abrir.
    requestAnimationFrame(() => {
      hourListRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "center" });
      minuteListRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "center" });
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePanelRect, true);
    window.addEventListener("resize", updatePanelRect);
    return () => {
      window.removeEventListener("scroll", updatePanelRect, true);
      window.removeEventListener("resize", updatePanelRect);
    };
  }, [isOpen, updatePanelRect]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  const commitHour = (hour: number) => {
    const minute = parsed?.minute ?? 0;
    onChange(`${pad2(hour)}:${pad2(minute)}`);
  };

  const commitMinute = (minute: number) => {
    const hour = parsed?.hour ?? 0;
    onChange(`${pad2(hour)}:${pad2(minute)}`);
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Enter") {
      e.preventDefault();
      close();
    }
  };

  const displayLabel = isValid ? `${pad2(parsed.hour)}:${pad2(parsed.minute)}` : "";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Clock
        className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted ${size === "sm" ? "left-2.5" : ""}`}
      />
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-required={required}
        disabled={disabled}
        onClick={() => setIsOpen(v => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full appearance-none rounded-control border border-border-default bg-surface text-left font-mono font-bold text-text-secondary outline-hidden transition-all duration-150 focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${SIZE_CLASSES[size]} ${leftPadding} ${FOCUS_RING_CLASSES[accent]} ${fieldErrorClasses(hasError)} ${
          isOpen ? "shadow-sm" : ""
        } ${disabled ? "" : `cursor-pointer ${ACCENT_HOVER_BORDER_CLASSES[accent]}`}`}
      >
        <span className={`block truncate ${displayLabel ? "" : "text-text-muted font-medium"}`}>
          {displayLabel || placeholder}
        </span>
      </button>
      {createPortal(
        <AnimatePresence>
          {isOpen && panelRect && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              tabIndex={-1}
              onKeyDown={handlePanelKeyDown}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={springs.snappy}
              style={{ left: panelRect.left, top: panelRect.top, width: Math.max(panelRect.width, 148) }}
              className="fixed z-50 overflow-hidden rounded-control border border-border-default bg-surface shadow-lg outline-hidden"
            >
              <div className="grid grid-cols-2 divide-x divide-border-subtle">
                <div>
                  <p className="sticky top-0 border-b border-border-subtle bg-surface px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wider text-text-muted">
                    Hora
                  </p>
                  <div ref={hourListRef} className="max-h-44 overflow-y-auto py-1">
                    {hours.map(hour => {
                      const isSelected = parsed?.hour === hour;
                      return (
                        <button
                          key={hour}
                          type="button"
                          data-selected={isSelected}
                          onClick={() => commitHour(hour)}
                          className={`flex w-full items-center justify-center py-1.5 font-mono text-xs font-bold transition-colors ${
                            isSelected
                              ? `${ACCENT_BG_CLASSES[accent]} text-white`
                              : `text-text-secondary ${ACCENT_HOVER_BG_CLASSES[accent]}`
                          }`}
                        >
                          {pad2(hour)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="sticky top-0 border-b border-border-subtle bg-surface px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wider text-text-muted">
                    Min
                  </p>
                  <div ref={minuteListRef} className="max-h-44 overflow-y-auto py-1">
                    {minutes.map(minute => {
                      const isSelected = parsed?.minute === minute;
                      return (
                        <button
                          key={minute}
                          type="button"
                          data-selected={isSelected}
                          onClick={() => commitMinute(minute)}
                          className={`flex w-full items-center justify-center py-1.5 font-mono text-xs font-bold transition-colors ${
                            isSelected
                              ? `${ACCENT_BG_CLASSES[accent]} text-white`
                              : `text-text-secondary ${ACCENT_HOVER_BG_CLASSES[accent]}`
                          }`}
                        >
                          {pad2(minute)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="border-t border-border-subtle bg-surface-sunken/50 px-2.5 py-1.5 text-center text-[9px] font-semibold text-text-muted">
                Formato 24h
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
