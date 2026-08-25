/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mide el espacio disponible del contenedor que envuelve a GridView — mismo
 * patrón que useContainerRows.ts (ResizeObserver sobre un containerRef, no
 * window.innerHeight/innerWidth), para que el grid se expanda exactamente al
 * espacio ya libre de sidebar/tabs/filtros del layout donde se monte, sin
 * duplicar esa resta a mano ni depender de medir la ventana completa.
 */

import { useEffect, useRef, useState } from "react";

export function useFullViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recalculate = () => setSize({ width: el.clientWidth, height: el.clientHeight });

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { containerRef, ...size };
}
