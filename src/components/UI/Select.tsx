/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Select estilizado TRUE VALUE: listbox custom (no `<select>` nativo) para
 * que el menú desplegado también siga el diseño de la app en vez de caer al
 * estilo del navegador/SO. Reemplaza los `<select>` con clases hardcoded
 * duplicadas que existían sueltos por toda la app antes de este componente.
 *
 * API pública idéntica a la versión anterior basada en `<select>` — value/
 * onChange sobre strings — para no requerir cambios en los consumidores.
 */

import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import type { SemanticColor } from "./colorTokens";
import { fieldErrorClasses } from "./FieldError";
import { springs } from "../../animations";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  /** Color de foco/acento. Default "info" (celeste/violeta), el más usado hoy en formularios. */
  accent?: SemanticColor;
  /** Tamaño del control. "sm" para selects inline en filas de tabla/tarjeta. */
  size?: "sm" | "md";
  /** Ícono inset a la izquierda (ej. Shield para "Rol"). Ajusta el padding automáticamente. */
  icon?: ReactNode;
  hasError?: boolean;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "py-1.5 pr-8 text-[11px]",
  md: "py-2.5 pr-9 text-xs",
};

const LEFT_PADDING: Record<NonNullable<SelectProps["size"]>, { withIcon: string; plain: string }> = {
  sm: { withIcon: "pl-8", plain: "pl-2.5" },
  md: { withIcon: "pl-10", plain: "pl-3.5" },
};

const FOCUS_RING_CLASSES: Record<SemanticColor, string> = {
  brand: "focus:ring-brand-200",
  success: "focus:ring-success-200",
  danger: "focus:ring-danger-200",
  warning: "focus:ring-warning-200",
  info: "focus:ring-info-200",
  neutral: "focus:ring-neutral-200",
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
  brand: "bg-brand-50",
  success: "bg-success-50",
  danger: "bg-danger-50",
  warning: "bg-warning-50",
  info: "bg-info-50",
  neutral: "bg-neutral-50",
};

const ACCENT_HOVER_BORDER_CLASSES: Record<SemanticColor, string> = {
  brand: "hover:border-brand-200",
  success: "hover:border-success-200",
  danger: "hover:border-danger-200",
  warning: "hover:border-warning-200",
  info: "hover:border-info-200",
  neutral: "hover:border-neutral-200",
};

export default function Select({
  value,
  onChange,
  options,
  id,
  accent = "info",
  size = "md",
  icon,
  hasError = false,
  disabled = false,
  required = false,
  ariaLabel,
  title,
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const selected = options.find((o) => o.value === value);
  const leftPadding = icon ? LEFT_PADDING[size].withIcon : LEFT_PADDING[size].plain;

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitSelection = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      onChange(option.value);
      close();
    },
    [options, onChange, close],
  );

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commitSelection(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-text-muted [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      )}
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-required={required}
        title={title}
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full appearance-none rounded-control border border-border-default bg-surface text-left font-semibold text-text-secondary outline-hidden transition-all duration-150 focus:border-transparent focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${SIZE_CLASSES[size]} ${leftPadding} ${FOCUS_RING_CLASSES[accent]} ${fieldErrorClasses(hasError)} ${
          isOpen ? "shadow-sm" : ""
        } ${disabled ? "" : `cursor-pointer ${ACCENT_HOVER_BORDER_CLASSES[accent]}`}`}
      >
        <span className="block truncate">{selected?.label ?? ""}</span>
      </button>
      <ChevronDown
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 text-text-muted transition-transform duration-200 ${
          isOpen ? "-translate-y-1/2 rotate-180" : "-translate-y-1/2"
        } ${disabled ? "opacity-60" : ""}`}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={(node) => {
              listRef.current = node;
              if (node) requestAnimationFrame(() => node.focus());
            }}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`${listboxId}-opt-${activeIndex}`}
            onKeyDown={handleListKeyDown}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={springs.snappy}
            className="absolute z-20 mt-1.5 max-h-56 w-full min-w-max overflow-auto rounded-control border border-border-default bg-surface py-1 shadow-lg outline-hidden"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commitSelection(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive ? ACCENT_BG_CLASSES[accent] : ""
                  } ${isSelected ? ACCENT_TEXT_CLASSES[accent] : "text-text-secondary"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
