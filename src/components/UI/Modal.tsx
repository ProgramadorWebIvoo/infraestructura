/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal genérico con createPortal, animaciones y slots header/body/footer.
 * Centraliza la estructura común de todos los modales del sistema.
 */

//@ts-ignore
import { createPortal } from "react-dom";
import { type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MaxWidth = "max-w-lg" | "max-w-xl" | "max-w-2xl" | "max-w-3xl" | "max-w-4xl";

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

const ICON_COLORS: Record<string, { bg: string; text: string }> = {
  sky:   { bg: "bg-sky-400/20", text: "text-sky-400" },
  amber: { bg: "bg-amber-400/20", text: "text-amber-400" },
  emerald: { bg: "bg-emerald-400/20", text: "text-emerald-400" },
  purple: { bg: "bg-purple-400/20", text: "text-purple-400" },
  rose:  { bg: "bg-rose-400/20", text: "text-rose-400" },
  slate: { bg: "bg-slate-400/20", text: "text-slate-400" },
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
  const iconStyle = ICON_COLORS[iconColor] ?? ICON_COLORS.amber;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-2xl w-full ${maxWidth} border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
          >
            {/* ── Header ── */}
            {(title || icon || badge) && (
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className={`${iconStyle.bg} ${iconStyle.text} p-2 rounded-xl shrink-0`}>
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
                      <h3 className="text-md font-bold font-sans truncate">{title}</h3>
                    )}
                    {infoLine && (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{infoLine}</p>
                    )}
                  </div>
                </div>
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    disabled={closeDisabled}
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-30 shrink-0 ml-3"
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
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
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
