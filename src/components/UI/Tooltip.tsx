/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tooltip genérico, reutilizable en cualquier vista. Generaliza el mecanismo
 * de SidebarTip.tsx (portal a `document.body` + posicionamiento `fixed` vía
 * getBoundingClientRect()) porque tablas/paneles usan `overflow-x-auto`, que
 * recortaría un tooltip no-portaled. A diferencia de SidebarTip, soporta
 * `placement` en las 4 direcciones y expone `aria-describedby` para que el
 * trigger quede accesible también por teclado, no solo por mouse.
 *
 * Los handlers y la ref se clonan sobre el hijo (Children.only) sin
 * envolverlo en un nodo extra, para no alterar layouts flex/gap existentes
 * (ej. filas de botones de acción).
 */

import {
  Children,
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type TargetAndTransition } from "motion/react";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  disabled?: boolean;
  delay?: number;
  className?: string;
  children: ReactElement;
}

type TipTargetProps = {
  ref?: Ref<HTMLElement>;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  "aria-describedby"?: string;
};

const GAP = 8;

function computePosition(rect: DOMRect, placement: TooltipPlacement) {
  switch (placement) {
    case "top":
      return { left: rect.left + rect.width / 2, top: rect.top - GAP };
    case "bottom":
      return { left: rect.left + rect.width / 2, top: rect.bottom + GAP };
    case "left":
      return { left: rect.left - GAP, top: rect.top + rect.height / 2 };
    case "right":
      return { left: rect.right + GAP, top: rect.top + rect.height / 2 };
  }
}

const bubbleVariants: Record<TooltipPlacement, { initial: TargetAndTransition; className: string }> = {
  top: { initial: { opacity: 0, y: 6, scale: 0.96 }, className: "-translate-x-1/2 -translate-y-full" },
  bottom: { initial: { opacity: 0, y: -6, scale: 0.96 }, className: "-translate-x-1/2" },
  left: { initial: { opacity: 0, x: 6, scale: 0.96 }, className: "-translate-x-full -translate-y-1/2" },
  right: { initial: { opacity: 0, x: -6, scale: 0.96 }, className: "-translate-y-1/2" },
};

export default function Tooltip({
  content,
  placement = "top",
  disabled = false,
  delay = 150,
  className = "",
  children,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    if (disabled) return;
    clearTimer();
    showTimer.current = setTimeout(() => {
      const el = anchorRef.current;
      if (!el) return;
      setPos(computePosition(el.getBoundingClientRect(), placement));
      setIsVisible(true);
    }, delay);
  }, [disabled, delay, placement, clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setIsVisible(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) hide();
    },
    [isVisible, hide],
  );

  const trigger = cloneElement(Children.only(children) as ReactElement<TipTargetProps>, {
    ref: anchorRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    onKeyDown: handleKeyDown,
    "aria-describedby": isVisible ? id : undefined,
  });

  const variant = bubbleVariants[placement];

  return (
    <>
      {trigger}
      {!disabled &&
        createPortal(
          <AnimatePresence>
            {isVisible && pos && (
              <motion.div
                id={id}
                role="tooltip"
                initial={variant.initial}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={variant.initial}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ left: pos.left, top: pos.top }}
                className={`fixed z-[90] pointer-events-none whitespace-nowrap rounded-lg border border-slate-700/60 bg-slate-800/95 px-2.5 py-1.5 text-xs font-semibold text-slate-100 shadow-xl shadow-slate-950/40 ring-1 ring-black/10 backdrop-blur-sm ${variant.className} ${className}`}
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
