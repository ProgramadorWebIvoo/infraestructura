/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal genérico con createPortal, animaciones y slots header/body/footer.
 * Centraliza la estructura común de todos los modales del sistema.
 */

import { createPortal } from "react-dom";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MaxWidth = "max-w-sm" | "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl" | "max-w-3xl" | "max-w-4xl" | "max-w-6xl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Slot para el contenido del body (scrollable) */
  children: ReactNode;
  /** Slot para el footer (opcional). Por defecto no se muestra footer */
  footer?: ReactNode;
  /** Ancho máximo del panel */
  maxWidth?: MaxWidth;
  /** Impedir cierre (deshabilita close button y backdrop click) */
  closeDisabled?: boolean;
  /** Ocultar el botón de cierre del header */
  hideCloseButton?: boolean;
  /** Icono del header (lucide icon component) */
  icon?: ReactNode;
  /** Texto del badge sobre el título */
  badge?: string;
  /** Título principal */
  title?: string;
  /** Línea de información secundaria (ID, metadata) */
  infoLine?: string;
  /** Background del icono: color tailwind ej. "amber" */
  iconColor?: string;
}

// ---------------------------------------------------------------------------
// Colores de icono
// ---------------------------------------------------------------------------

/**
 * Vocabulario de color histórico de los modales (nombres Tailwind "crudos")
 * mapeado a los 6 roles semánticos de `colorTokens.ts` — mismo criterio que
 * `SectionHeader.COLOR_TO_SEMANTIC`. Corrige un bug preexistente: "indigo"
 * se usaba en 2 modales (`AIConfigFormModal`, `ContractorFormModal`) pero no
 * estaba en el `ICON_COLORS` original, así que caían silenciosamente al
 * fallback `amber` sin que nadie lo notara.
 */
const ICON_COLOR_TO_SEMANTIC: Record<string, SemanticColor> = {
  sky: "brand",
  blue: "brand",
  purple: "info",
  indigo: "info",
  emerald: "success",
  amber: "warning",
  rose: "danger",
  slate: "neutral",
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function Modal({
  isOpen,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
  closeDisabled = false,
  hideCloseButton = false,
  icon,
  badge,
  title,
  infoLine,
  iconColor = "amber",
}: ModalProps) {
  const semantic = SEMANTIC_COLOR_MAP[ICON_COLOR_TO_SEMANTIC[iconColor] ?? "warning"];
  const iconStyle = { bg: semantic.bgAlpha400, text: semantic.icon400 };
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ── Keep mutable callbacks in refs so the effect never re-runs due to reference changes ──
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeDisabledRef = useRef(closeDisabled);
  closeDisabledRef.current = closeDisabled;

  // ── Focus trap + ESC key (stable reference, reads refs for latest values) ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && !closeDisabledRef.current) {
      onCloseRef.current();
      return;
    }
    if (e.key !== "Tab" || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element inside modal (deferred to let motion mount)
    requestAnimationFrame(() => {
      if (modalRef.current) {
        const first = modalRef.current.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      }
    });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "Diálogo"}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`bg-surface rounded-container w-full ${maxWidth} border border-border-default shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
          >
            {/* ── Header ── */}
            {(title || icon || badge) && (
              <div className="p-5 bg-surface-inverted text-text-inverted flex items-center justify-between border-b border-border-inverted shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div data-testid="modal-icon" className={`${iconStyle.bg} ${iconStyle.text} p-2 rounded-control shrink-0`}>
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {badge && (
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block truncate">
                        {badge}
                      </span>
                    )}
                    {title && (
                      <h3 className="text-md font-black font-brand tracking-tight truncate">{title}</h3>
                    )}
                    {infoLine && (
                      <p className="text-[11px] text-text-muted font-mono mt-0.5 truncate">{infoLine}</p>
                    )}
                  </div>
                </div>
                {!hideCloseButton && (
                  <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={onClose}
                    disabled={closeDisabled}
                    className="cursor-pointer text-text-muted hover:text-text-inverted p-1 rounded-full hover:bg-border-inverted transition-colors disabled:cursor-not-allowed disabled:opacity-30 shrink-0 ml-3"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {children}
            </div>

            {/* ── Footer ── */}
            {footer && (
              <div className="p-4 border-t border-border-subtle bg-surface-sunken shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
