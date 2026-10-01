/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ciclo de vida de la captura global del DEBUG-MODE: instala los listeners
 * (errores no manejados, observers de Performance) solo mientras `active` es
 * true y los remueve al apagarlo o al desmontar — costo cero cuando el modo
 * está apagado o el rol no lo permite. Va en App (no en DebugPanel): el panel
 * puede estar cerrado y la captura debe seguir viva.
 */

import { useEffect } from "react";
import { installGlobalErrorCapture, installPerfObservers } from "@/stores/debugCapture";

export function useDebugRuntime(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const disposers = [installGlobalErrorCapture(), installPerfObservers()];
    return () => disposers.forEach(dispose => dispose());
  }, [active]);
}
