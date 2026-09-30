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
  useLayoutEffect,
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
const EDGE_MARGIN = 8;

// El foco que llega tras un click/tap (típicamente el navegador devolviéndolo
// al trigger al cerrar un modal) no es navegación por teclado: mostrar el
// tooltip ahí lo dejaba pegado, porque el mouse ya no está sobre el trigger y
// nunca llega un mouseleave. Se registra una sola vez, a nivel de documento,
// cuál fue la última interacción (puntero o teclado).
let lastInteractionWasPointer = false;
let modalityTracked = false;

function trackInteractionModality() {
  if (modalityTracked || typeof document === "undefined") return;
  modalityTracked = true;
  document.addEventListener("pointerdown", () => { lastInteractionWasPointer = true; }, true);
  document.addEventListener("keydown", () => { lastInteractionWasPointer = false; }, true);
}

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

// El bubble se posiciona con `left`/`top` + un translate por CSS según
// `placement` (ver bubbleVariants). Para que no se corte contra el borde del
// viewport, hay que clampear esa coordenada tomando en cuenta cuál lado del
// bubble representa (centro, borde, o extremo) una vez conocido su tamaño
// real ya renderizado — por eso corre en un segundo paso, después del mount.
function clampToViewport(
  pos: { left: number; top: number },
  placement: TooltipPlacement,
  size: { width: number; height: number },
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let { left, top } = pos;

  switch (placement) {
    case "top":
    case "bottom": {
      const halfW = size.width / 2;
      const minLeft = EDGE_MARGIN + halfW;
      const maxLeft = vw - EDGE_MARGIN - halfW;
      left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));
      if (placement === "top") {
        top = Math.min(Math.max(top, EDGE_MARGIN + size.height), vh - EDGE_MARGIN);
      } else {
        top = Math.min(Math.max(top, EDGE_MARGIN), vh - EDGE_MARGIN - size.height);
      }
      break;
    }
    case "left":
    case "right": {
      const halfH = size.height / 2;
      const minTop = EDGE_MARGIN + halfH;
      const maxTop = vh - EDGE_MARGIN - halfH;
      top = Math.min(Math.max(top, minTop), Math.max(minTop, maxTop));
      if (placement === "left") {
        left = Math.min(Math.max(left, EDGE_MARGIN + size.width), vw - EDGE_MARGIN);
      } else {
        left = Math.min(Math.max(left, EDGE_MARGIN), vw - EDGE_MARGIN - size.width);
      }
      break;
    }
  }

  return { left, top };
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
  const bubbleRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [clamped, setClamped] = useState(false);

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
      setClamped(false);
      setIsVisible(true);
    }, delay);
  }, [disabled, delay, placement, clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setIsVisible(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(trackInteractionModality, []);

  const handleFocus = useCallback(() => {
    if (lastInteractionWasPointer) return;
    show();
  }, [show]);

  // Mientras está visible, el tooltip se cierra solo si el mouse deja de estar
  // sobre el trigger, si se hace click (p.ej. el click que abre un modal) o si
  // la ventana pierde el foco. mouseleave no basta: un modal/overlay que
  // aparece encima del trigger no lo dispara hasta que el mouse se mueva.
  useEffect(() => {
    if (!isVisible) return;
    const dismiss = (e: Event) => {
      if (e.type === "pointermove" && anchorRef.current?.contains(e.target as Node)) return;
      hide();
    };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("pointermove", dismiss, true);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("pointermove", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, [isVisible, hide]);

  // Corrige la posición una vez que el bubble ya tiene su tamaño real en el
  // DOM (no se puede saber su ancho/alto antes de renderizarlo). Sin esto,
  // un tooltip disparado cerca del borde de la ventana queda centrado en el
  // anchor y su mitad sobresale fuera del viewport, cortándose visualmente.
  useLayoutEffect(() => {
    if (!isVisible || !pos || clamped) return;
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const { width, height } = bubble.getBoundingClientRect();
    const next = clampToViewport(pos, placement, { width, height });
    if (next.left !== pos.left || next.top !== pos.top) setPos(next);
    setClamped(true);
  }, [isVisible, pos, placement, clamped]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) hide();
    },
    [isVisible, hide],
  );

  const child = Children.only(children) as ReactElement<TipTargetProps>;
  // El hijo puede traer su propio `ref` (p.ej. <Tabs> mide la posición real
  // de cada botón para el indicador deslizante) — `cloneElement` con un
  // `ref` nuevo REEMPLAZA cualquier ref existente en vez de acumularlo, así
  // que sin fusionar ambos, el ref del consumidor se pierde en silencio (sin
  // error, simplemente nunca se invoca) y cualquier medición que dependa de
  // él queda siempre vacía.
  const childRef = (child as unknown as { ref?: Ref<HTMLElement> }).ref;
  const mergedRef: Ref<HTMLElement> = (node) => {
    anchorRef.current = node;
    if (typeof childRef === "function") childRef(node);
    else if (childRef && "current" in childRef) (childRef as { current: HTMLElement | null }).current = node;
  };

  const trigger = cloneElement(child, {
    ref: mergedRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: handleFocus,
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
                ref={bubbleRef}
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
