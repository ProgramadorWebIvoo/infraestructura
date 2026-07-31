/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tooltip del sidebar en modo colapsado. Se renderiza en un portal a
 * `document.body` porque el nav usa `overflow-y-auto` y el aside aplica
 * `transform-gpu`: un tooltip posicionado `fixed` dentro de ese árbol quedaría
 * recortado por el overflow o re-posicionado contra un containing block
 * distinto al viewport (el transform del aside). El portal escapa ambos.
 *
 * Los handlers y la ref se clonan sobre el hijo (Children.only) sin envolverlo
 * en un nodo extra, para no alterar el layout del flex/space-y del sidebar.
 */

import { Children, cloneElement, memo, useCallback, useRef, useState, type ReactElement, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

interface SidebarTipProps {
  /** Contenido del tooltip (string o nodo rico, p.ej. nombre + email). */
  label: ReactNode;
  /** Cuando `true` el tooltip no se dispara (modo expandido). */
  disabled?: boolean;
  /** Un único elemento React que actúa como target del hover/focus. */
  children: ReactElement;
}

// Props que se clonan sobre el target (ref + handlers de hover/focus).
type TipTargetProps = {
  ref?: Ref<HTMLElement>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

function SidebarTip({ label, disabled = false, children }: SidebarTipProps) {
  const anchorRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = useCallback(() => {
    if (disabled) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.right + 12, top: rect.top + rect.height / 2 });
    setIsVisible(true);
  }, [disabled]);

  const hide = useCallback(() => setIsVisible(false), []);

  const trigger = cloneElement(Children.only(children) as ReactElement<TipTargetProps>, {
    ref: anchorRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <>
      {trigger}
      {createPortal(
        <AnimatePresence>
          {isVisible && pos && (
            <motion.div
              role="tooltip"
              initial={{ opacity: 0, x: -8, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ left: pos.left, top: pos.top }}
              className="fixed z-[90] -translate-y-1/2 pointer-events-none whitespace-nowrap rounded-lg border border-slate-700/60 bg-slate-800/95 px-2.5 py-1.5 text-xs font-semibold text-slate-100 shadow-xl shadow-slate-950/40 ring-1 ring-black/10 backdrop-blur-sm"
            >
              {/* Flecha apuntando al rail */}
              <span
                aria-hidden="true"
                className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-slate-800/95 border-l border-b border-slate-700/60"
              />
              <span className="relative">{label}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export default memo(SidebarTip);
