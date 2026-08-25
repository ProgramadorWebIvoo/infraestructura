/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Popover flotante, controlado por click (no hover) — adaptado del patrón de
 * portal + getBoundingClientRect() de Tooltip.tsx, pero con contenido
 * interactivo (pointer-events-auto) y cierre por click-outside/ESC. No existe
 * un Popover genérico en el repo; este es el primero, pensado para el
 * historial de versiones de un documento, pero sin acoplarse a ese dominio.
 */

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

interface VersionHistoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  placement?: "bottom" | "top";
}

const GAP = 8;

export default function VersionHistoryPopover({ isOpen, onClose, anchorRef, children, placement = "bottom" }: VersionHistoryPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      left: rect.right,
      top: placement === "bottom" ? rect.bottom + GAP : rect.top - GAP,
    });
  }, [isOpen, anchorRef, placement]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          ref={popoverRef}
          role="dialog"
          aria-label="Historial de versiones"
          initial={{ opacity: 0, y: placement === "bottom" ? -6 : 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement === "bottom" ? -6 : 6, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ left: pos.left, top: pos.top }}
          className={`fixed z-[90] w-64 -translate-x-full ${placement === "top" ? "-translate-y-full" : ""} rounded-xl border border-slate-700/60 bg-slate-800/95 shadow-xl shadow-slate-950/40 ring-1 ring-black/10 backdrop-blur-sm pointer-events-auto`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
