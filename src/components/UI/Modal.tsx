/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal genérico con createPortal, animaciones y slots header/body/footer.
 * Centraliza la estructura común de todos los modales del sistema.
 */

import { createPortal } from "react-dom";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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
  const reduceMotion = useReducedMotion();

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
        <motion.div
          data-testid="modal-backdrop"
          // Solo se anima `opacity`. Animar `backdropFilter` obliga al
          // compositor a re-desenfocar todo lo que hay detrás del modal en
          // CADA frame — es de las propiedades más caras que existen, y se
          // notaba como tirones al abrir cualquier modal de la app. El blur
          // ya lo aplica `backdrop-blur-md` de forma estática (una sola vez),
          // así que animarlo además duplicaba el efecto y el costo.
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "Diálogo"}
        >
          <motion.div
            ref={modalRef}
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.94, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 10 }}
            transition={reduceMotion ? undefined : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`bg-surface rounded-container w-full ${maxWidth} border border-border-default overflow-hidden max-h-[90vh] flex flex-col [box-shadow:0_2px_4px_rgba(0,0,0,0.06),0_12px_24px_-6px_rgba(0,0,0,0.14),0_40px_80px_-20px_rgba(2,6,23,0.45)]`}
          >
            {/* ── Header ── */}
            {(title || icon || badge) && (
              <div className="relative shrink-0 overflow-hidden border-b border-border-inverted bg-surface-inverted p-5 text-text-inverted">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_140%_at_0%_0%,rgba(255,255,255,0.06),transparent_60%)]"
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                      <motion.div
                        data-testid="modal-icon"
                        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.6, rotate: -6 }}
                        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1], delay: 0.08 }}
                        className={`${iconStyle.bg} ${iconStyle.text} shrink-0 rounded-control p-2 ring-1 ring-white/10`}
                      >
                        {icon}
                      </motion.div>
                    )}
                    <div className="min-w-0">
                      {badge && (
                        <span className="block truncate text-[10px] font-mono font-bold uppercase tracking-wide text-amber-400">
                          {badge}
                        </span>
                      )}
                      {title && (
                        <h3 className="text-md truncate font-brand font-black tracking-tight">{title}</h3>
                      )}
                      {infoLine && (
                        <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">{infoLine}</p>
                      )}
                    </div>
                  </div>
                  {!hideCloseButton && (
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={onClose}
                      disabled={closeDisabled}
                      className="ml-3 shrink-0 cursor-pointer rounded-full p-1 text-text-muted transition-all duration-150 hover:bg-border-inverted hover:text-text-inverted active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Body ── */}
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}
              className="flex-1 space-y-6 overflow-y-auto p-6"
            >
              {children}
            </motion.div>

            {/* ── Footer ── */}
            {footer && (
              <div className="shrink-0 border-t border-border-subtle bg-surface-sunken p-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
