/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mide los FPS reales del hilo principal con requestAnimationFrame y los
 * publica en usePerfStore (para el tab Performance y el diagnóstico). El
 * loop SOLO corre mientras `active` es true (tab Performance abierto): un
 * rAF permanente tendría costo para todas las sesiones con el modo activo.
 */

import { useEffect } from "react";
import { usePerfStore } from "@/stores/debugCapture";
import { createFpsCounter } from "@/utils/debugPerformance";

export function useFpsMeter(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const { setPerfMetrics } = usePerfStore.getState();
    const counter = createFpsCounter(fps => setPerfMetrics(prev => ({ ...prev, fps })));

    let frameId = requestAnimationFrame(function loop(now) {
      counter.tick(now);
      frameId = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(frameId);
  }, [active]);
}
