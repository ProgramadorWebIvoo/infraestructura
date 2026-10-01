/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Redimensionado del panel del DEBUG-MODE por arrastre (pointer events con
 * captura) o con las flechas del teclado sobre el handle. Durante el arrastre
 * el tamaño vive solo en estado local (`dragSize`); se confirma (y persiste)
 * al soltar, para no escribir localStorage en cada movimiento.
 */

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { computeResizedSize, keyboardResizeDelta, type DebugDock, type Viewport } from "@/utils/debugLayout";

interface UseDebugResizeParams {
  dock: DebugDock;
  size: { width: number; height: number };
  viewport: Viewport;
  onCommit: (size: { width: number; height: number }) => void;
}

export function useDebugResize({ dock, size, viewport, onCommit }: UseDebugResizeParams) {
  const [dragSize, setDragSize] = useState<{ width: number; height: number } | null>(null);
  const drag = useRef<{ x: number; y: number; start: { width: number; height: number } } | null>(null);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY, start: size };
    },
    [size],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!drag.current) return;
      const { x, y, start } = drag.current;
      setDragSize(computeResizedSize(dock, start, { dx: e.clientX - x, dy: e.clientY - y }, viewport));
    },
    [dock, viewport],
  );

  const finish = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!drag.current) return;
      const { x, y, start } = drag.current;
      drag.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragSize(null);
      onCommit(computeResizedSize(dock, start, { dx: e.clientX - x, dy: e.clientY - y }, viewport));
    },
    [dock, viewport, onCommit],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const delta = keyboardResizeDelta(e.key);
      if (!delta) return;
      e.preventDefault();
      onCommit(computeResizedSize(dock, size, delta, viewport));
    },
    [dock, size, viewport, onCommit],
  );

  return {
    /** Tamaño a renderizar: el del arrastre en curso o el confirmado. */
    size: dragSize ?? size,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onKeyDown },
  };
}
