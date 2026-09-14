/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector de fecha TRUE VALUE: calendario custom animado (no `<input
 * type="date">` nativo) para que el picker también siga el diseño de la app
 * en vez de caer al estilo del navegador/SO — mismo problema que motivó
 * `Select.tsx`. Reemplaza los `<input type="date">` sueltos con clases
 * hardcoded que existían en RegisterProposalModal/RenegotiateProposalModal/
 * ProyectCreateTab/AuditLogSection/RevisedDocumentsSection/
 * ConfigAuditLogPanel.
 *
 * Mismo mecanismo de portal que `Select.tsx`: `createPortal` + `position:
 * fixed` vía `getBoundingClientRect()` en vez de `position: absolute`
 * relativo al trigger, para no quedar atrapado dentro de un ancestro con
 * `overflow-y-auto` (ej. el body scrolleable de `Modal`).
 *
 * API pública: value/onChange sobre string ISO "YYYY-MM-DD" (mismo formato
 * que `<input type="date">.value`) para no requerir cambios de tipo en los
 * consumidores — solo cambia el input HTML por este componente y el import.
 * Sin dependencia de date-fns/dayjs (no está instalada en el proyecto):
 * los cálculos de calendario usan `Date` nativo en UTC-less (hora local a
 * medianoche) para evitar el corrimiento de día por timezone que produce
 * `new Date("YYYY-MM-DD")` (que parsea como UTC).
 *
 * Navegación por niveles (días → meses → años, mismo patrón que el date
 * picker nativo de macOS/Windows): el título del header es clickeable y
 * sube un nivel, para no obligar al usuario a hacer click 60+ veces en
 * "mes siguiente" para llegar a una fecha de hace 5 años. `min`/`max` se
 * respetan en los TRES niveles (no solo deshabilitando días sueltos): un
 * mes/año fuera de rango también aparece deshabilitado, y las flechas de
 * navegación se bloquean en el límite — antes solo se deshabilitaban los
 * días individuales, así que el usuario podía navegar a un mes/década
 * enteramente fuera de rango y ver una grilla completamente gris sin poder
 * volver más allá con las flechas siquiera.
 */

import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { SemanticColor } from "./colorTokens";
import { FOCUS_RING_CLASSES } from "./colorTokens";
import { fieldErrorClasses } from "./FieldError";
import { springs } from "@/animations";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  accent?: SemanticColor;
  size?: "sm" | "md";
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<DatePickerProps["size"]>, string> = {
  sm: "py-1.5 pl-8 pr-3 text-[11px]",
  md: "py-2.5 pl-10 pr-3.5 text-xs",
};

const ACCENT_TEXT_CLASSES: Record<SemanticColor, string> = {
  brand: "text-brand-600",
  success: "text-success-600",
  danger: "text-danger-600",
  warning: "text-warning-600",
  info: "text-info-600",
  neutral: "text-neutral-600",
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

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parsea "YYYY-MM-DD" como fecha LOCAL a medianoche — evita el corrimiento de día que da `new Date(iso)` (UTC). */
function parseISODate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Índice de día de semana con lunes=0 (en vez del domingo=0 nativo) — la grilla del calendario empieza en lunes. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function buildCalendarGrid(viewYear: number, viewMonth: number): Date[] {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const start = new Date(viewYear, viewMonth, 1 - mondayIndex(firstOfMonth));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** Último día de un mes (día 0 del mes siguiente) — límite superior para comparar un mes completo contra min/max. */
function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/** true si TODO el mes cae fuera de [min, max] — el mes entero se deshabilita, no solo sus días. */
function isMonthOutOfRange(year: number, month: number, minDate: Date | null, maxDate: Date | null): boolean {
  const firstDay = new Date(year, month, 1);
  const lastDay = lastDayOfMonth(year, month);
  return (!!minDate && lastDay < minDate) || (!!maxDate && firstDay > maxDate);
}

/** true si TODO el año cae fuera de [min, max]. */
function isYearOutOfRange(year: number, minDate: Date | null, maxDate: Date | null): boolean {
  return (!!minDate && new Date(year, 11, 31) < minDate) || (!!maxDate && new Date(year, 0, 1) > maxDate);
}

/** Año de inicio de la década (grilla de 12) que contiene `year`, con 1 año de margen antes/después. */
function decadeStart(year: number): number {
  return Math.floor((year - 1) / 10) * 10 + 1;
}

type ViewLevel = "days" | "months" | "years";

export default function DatePicker({
  value,
  onChange,
  id,
  min,
  max,
  accent = "info",
  size = "md",
  hasError = false,
  disabled = false,
  required = false,
  placeholder = "Seleccionar fecha",
  ariaLabel,
  className = "",
}: DatePickerProps) {
  const selectedDate = useMemo(() => parseISODate(value), [value]);
  const minDate = useMemo(() => parseISODate(min), [min]);
  const maxDate = useMemo(() => parseISODate(max), [max]);
  const today = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? today);
  const [viewLevel, setViewLevel] = useState<ViewLevel>("days");
  const [panelRect, setPanelRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const gridId = `${id ?? generatedId}-grid`;

  const leftPadding = size === "sm" ? "pl-8" : "pl-10";

  const isDisabledDate = useCallback(
    (date: Date) => (minDate ? date < minDate : false) || (maxDate ? date > maxDate : false),
    [minDate, maxDate],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const updatePanelRect = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelRect({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setViewDate(selectedDate ?? today);
    setViewLevel("days");
    updatePanelRect();
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

  const commitDate = useCallback(
    (date: Date) => {
      if (isDisabledDate(date)) return;
      onChange(toISODate(date));
      close();
    },
    [isDisabledDate, onChange, close],
  );

  const isMonthDisabled = useCallback(
    (year: number, month: number) => isMonthOutOfRange(year, month, minDate, maxDate),
    [minDate, maxDate],
  );
  const isYearDisabled = useCallback((year: number) => isYearOutOfRange(year, minDate, maxDate), [minDate, maxDate]);

  const goToMonth = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  const goToYear = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear() + delta, d.getMonth(), 1));
  };

  const goToDecade = (delta: number) => {
    setViewDate((d) => new Date(d.getFullYear() + delta * 10, d.getMonth(), 1));
  };

  const canGoToPrevMonth = !isMonthDisabled(
    viewDate.getMonth() === 0 ? viewDate.getFullYear() - 1 : viewDate.getFullYear(),
    viewDate.getMonth() === 0 ? 11 : viewDate.getMonth() - 1,
  );
  const canGoToNextMonth = !isMonthDisabled(
    viewDate.getMonth() === 11 ? viewDate.getFullYear() + 1 : viewDate.getFullYear(),
    viewDate.getMonth() === 11 ? 0 : viewDate.getMonth() + 1,
  );
  const canGoToPrevYear = !isYearDisabled(viewDate.getFullYear() - 1);
  const canGoToNextYear = !isYearDisabled(viewDate.getFullYear() + 1);
  const decadeYearsList = useMemo(() => {
    const start = decadeStart(viewDate.getFullYear());
    return Array.from({ length: 12 }, (_, i) => start + i - 1);
  }, [viewDate]);
  const canGoToPrevDecade = decadeYearsList.some((y) => !isYearDisabled(y - 10));
  const canGoToNextDecade = decadeYearsList.some((y) => !isYearDisabled(y + 10));

  const selectMonth = (month: number) => {
    if (isMonthDisabled(viewDate.getFullYear(), month)) return;
    setViewDate((d) => new Date(d.getFullYear(), month, 1));
    setViewLevel("days");
  };

  const selectYear = (year: number) => {
    if (isYearDisabled(year)) return;
    setViewDate((d) => new Date(year, d.getMonth(), 1));
    setViewLevel("months");
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
    }
  };

  const grid = useMemo(() => buildCalendarGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const displayLabel = selectedDate
    ? `${pad2(selectedDate.getDate())}/${pad2(selectedDate.getMonth() + 1)}/${selectedDate.getFullYear()}`
    : "";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Calendar
        className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted ${size === "sm" ? "left-2.5" : ""}`}
      />
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={gridId}
        aria-label={ariaLabel}
        aria-required={required}
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
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
              id={gridId}
              role="dialog"
              aria-modal="false"
              tabIndex={-1}
              onKeyDown={handlePanelKeyDown}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={springs.snappy}
              style={{ left: panelRect.left, top: panelRect.top, width: Math.max(panelRect.width, 264) }}
              className="fixed z-50 rounded-control border border-border-default bg-surface p-3 shadow-lg outline-hidden"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => (viewLevel === "days" ? goToMonth(-1) : viewLevel === "months" ? goToYear(-1) : goToDecade(-1))}
                  disabled={viewLevel === "days" ? !canGoToPrevMonth : viewLevel === "months" ? !canGoToPrevYear : !canGoToPrevDecade}
                  className={`flex h-7 w-7 items-center justify-center rounded-control text-text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${ACCENT_HOVER_BG_CLASSES[accent]} ${ACCENT_TEXT_CLASSES[accent].replace("text-", "hover:text-")}`}
                  aria-label={viewLevel === "days" ? "Mes anterior" : viewLevel === "months" ? "Año anterior" : "Década anterior"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewLevel(viewLevel === "days" ? "months" : "years")}
                  disabled={viewLevel === "years"}
                  className={`rounded-control px-2 py-1 text-xs font-bold text-text-secondary transition-colors disabled:cursor-default ${
                    viewLevel === "years" ? "" : `cursor-pointer ${ACCENT_HOVER_BG_CLASSES[accent]}`
                  }`}
                >
                  {viewLevel === "days" && `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
                  {viewLevel === "months" && viewDate.getFullYear()}
                  {viewLevel === "years" && `${decadeYearsList[1]} – ${decadeYearsList[10]}`}
                </button>
                <button
                  type="button"
                  onClick={() => (viewLevel === "days" ? goToMonth(1) : viewLevel === "months" ? goToYear(1) : goToDecade(1))}
                  disabled={viewLevel === "days" ? !canGoToNextMonth : viewLevel === "months" ? !canGoToNextYear : !canGoToNextDecade}
                  className={`flex h-7 w-7 items-center justify-center rounded-control text-text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${ACCENT_HOVER_BG_CLASSES[accent]} ${ACCENT_TEXT_CLASSES[accent].replace("text-", "hover:text-")}`}
                  aria-label={viewLevel === "days" ? "Mes siguiente" : viewLevel === "months" ? "Año siguiente" : "Década siguiente"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {viewLevel === "days" && (
                <>
                  <div className="mb-1 grid grid-cols-7 gap-0.5">
                    {WEEKDAY_LABELS.map((w) => (
                      <span key={w} className="flex h-6 items-center justify-center text-[10px] font-bold uppercase text-text-muted">
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {grid.map((date) => {
                      const inMonth = date.getMonth() === viewDate.getMonth();
                      const isSelected = !!selectedDate && isSameDay(date, selectedDate);
                      const isToday = isSameDay(date, today);
                      const isDisabled = isDisabledDate(date);
                      return (
                        <motion.button
                          key={date.toISOString()}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => commitDate(date)}
                          whileTap={isDisabled ? undefined : { scale: 0.9 }}
                          aria-pressed={isSelected}
                          aria-label={`${date.getDate()} de ${MONTH_LABELS[date.getMonth()]} de ${date.getFullYear()}`}
                          className={`relative flex h-8 items-center justify-center rounded-control text-[11px] font-bold transition-colors ${
                            isDisabled
                              ? "cursor-not-allowed text-text-muted/40"
                              : isSelected
                                ? `${ACCENT_BG_CLASSES[accent]} text-white shadow-sm`
                                : inMonth
                                  ? `text-text-secondary ${ACCENT_HOVER_BG_CLASSES[accent]}`
                                  : `text-text-muted/50 ${ACCENT_HOVER_BG_CLASSES[accent]}`
                          }`}
                        >
                          {date.getDate()}
                          {isToday && !isSelected && (
                            <span className={`absolute bottom-1 h-1 w-1 rounded-full ${ACCENT_BG_CLASSES[accent]}`} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {viewLevel === "months" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_LABELS.map((label, month) => {
                    const isSelected = viewDate.getMonth() === month && !!selectedDate && selectedDate.getFullYear() === viewDate.getFullYear();
                    const isDisabled = isMonthDisabled(viewDate.getFullYear(), month);
                    return (
                      <motion.button
                        key={label}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => selectMonth(month)}
                        whileTap={isDisabled ? undefined : { scale: 0.95 }}
                        className={`flex h-10 items-center justify-center rounded-control text-[11px] font-bold transition-colors ${
                          isDisabled
                            ? "cursor-not-allowed text-text-muted/40"
                            : isSelected
                              ? `${ACCENT_BG_CLASSES[accent]} text-white shadow-sm`
                              : `text-text-secondary ${ACCENT_HOVER_BG_CLASSES[accent]}`
                        }`}
                      >
                        {label.slice(0, 3)}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {viewLevel === "years" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {decadeYearsList.map((year, i) => {
                    const isEdge = i === 0 || i === 11;
                    const isSelected = !!selectedDate && selectedDate.getFullYear() === year;
                    const isDisabled = isYearDisabled(year);
                    return (
                      <motion.button
                        key={year}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => selectYear(year)}
                        whileTap={isDisabled ? undefined : { scale: 0.95 }}
                        className={`flex h-10 items-center justify-center rounded-control text-[11px] font-bold transition-colors ${
                          isDisabled
                            ? "cursor-not-allowed text-text-muted/40"
                            : isSelected
                              ? `${ACCENT_BG_CLASSES[accent]} text-white shadow-sm`
                              : isEdge
                                ? `text-text-muted/50 ${ACCENT_HOVER_BG_CLASSES[accent]}`
                                : `text-text-secondary ${ACCENT_HOVER_BG_CLASSES[accent]}`
                        }`}
                      >
                        {year}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
