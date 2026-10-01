/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Handle de redimensionado del panel: se ubica en el borde que mira a la app
 * según el acople. Operable con mouse/touch (arrastre) y con el teclado
 * (foco + flechas).
 */

import type { HTMLAttributes } from "react";
import type { DebugDock } from "@/utils/debugLayout";

const HANDLE_CLASS: Record<DebugDock, string> = {
  right: "absolute left-0 top-0 h-full w-1.5 cursor-ew-resize",
  left: "absolute right-0 top-0 h-full w-1.5 cursor-ew-resize",
  bottom: "absolute left-0 top-0 h-1.5 w-full cursor-ns-resize",
  floating: "absolute left-0 top-0 h-3 w-3 cursor-nwse-resize",
};

interface DebugResizeHandleProps {
  dock: DebugDock;
  handleProps: HTMLAttributes<HTMLElement>;
}

export default function DebugResizeHandle({ dock, handleProps }: DebugResizeHandleProps) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={dock === "bottom" ? "horizontal" : "vertical"}
      aria-label="Redimensionar panel (arrastra o usa las flechas)"
      className={`${HANDLE_CLASS[dock]} z-10 touch-none bg-transparent transition-colors hover:bg-brand-400/40 focus-visible:bg-brand-400/60 focus-visible:outline-hidden`}
      {...handleProps}
    />
  );
}
