/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tamaño actual del viewport (se actualiza al redimensionar la ventana).
 */

import { useEffect, useState } from "react";

export function useViewportSize(target: Window = window): { width: number; height: number } {
  const [size, setSize] = useState({ width: target.innerWidth, height: target.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ width: target.innerWidth, height: target.innerHeight });
    onResize();
    target.addEventListener("resize", onResize);
    return () => target.removeEventListener("resize", onResize);
  }, [target]);

  return size;
}
