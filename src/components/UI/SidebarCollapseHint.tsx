/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aviso flotante de "primera vez" que señala dónde está el botón de
 * colapsar/expandir el sidebar. Se dispara una sola vez por navegador
 * (persistido en localStorage, mismo patrón que ivoo.sidebar.collapsed) y
 * se auto-oculta sola tras unos segundos o al primer clic en cualquier
 * lado de la página — lo que ocurra primero.
 *
 * Portal a document.body por la misma razón que SidebarTip: el aside usa
 * transform-gpu y el nav overflow-y-auto, así que un elemento `fixed`
 * anidado ahí quedaría recortado o mal posicionado.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const STORAGE_KEY = "ivoo.sidebar.collapseHintSeen";
const SHOW_DELAY_MS = 1200;
const AUTO_HIDE_MS = 6000;

interface SidebarCollapseHintProps {
  /** Elemento ancla (el botón de colapso) — se posiciona el hint relativo a él. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Debe coincidir con la disponibilidad real del botón (oculto en mobile). */
  enabled: boolean;
}

export default function SidebarCollapseHint({ anchorRef, enabled }: SidebarCollapseHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const hasScheduledRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasScheduledRef.current) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    hasScheduledRef.current = true;

    const showTimer = setTimeout(() => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({ left: rect.left + rect.width / 2, top: rect.bottom + 10 });
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(showTimer);
  }, [enabled, anchorRef]);

  useEffect(() => {
    if (!isVisible) return;

    const dismiss = () => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, "1");
    };

    const hideTimer = setTimeout(dismiss, AUTO_HIDE_MS);
    // capture=true: se cierra ante cualquier clic, incluyendo el propio botón
    // de colapso (que además de cerrar el hint dispara su propia acción).
    document.addEventListener("click", dismiss, { capture: true });

    return () => {
      clearTimeout(hideTimer);
      document.removeEventListener("click", dismiss, { capture: true });
    };
  }, [isVisible]);

  return createPortal(
    <AnimatePresence>
      {isVisible && pos && (
        <motion.div
          role="tooltip"
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ left: pos.left, top: pos.top }}
          className="fixed z-[95] -translate-x-1/2 pointer-events-none whitespace-nowrap rounded-lg border border-brand-400/40 bg-slate-800/95 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-xl shadow-slate-950/40 ring-1 ring-black/10 backdrop-blur-sm"
        >
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[-5px] -translate-x-1/2 h-2.5 w-2.5 rotate-45 rounded-[2px] bg-slate-800/95 border-l border-t border-brand-400/40"
          />
          <span className="relative">Acá podés minimizar la barra lateral</span>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
