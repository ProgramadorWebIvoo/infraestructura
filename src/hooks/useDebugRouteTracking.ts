/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registra en el DEBUG-MODE (categoría USER_ACTION) cada cambio de ruta:
 * contexto básico para saber "en qué pantalla estaba" cuando ocurrió un error.
 * Solo escucha mientras el modo está activo.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pushDebugEntry } from "@/stores/debugStore";

export function useDebugRouteTracking(active: boolean): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!active) return;
    pushDebugEntry({
      kind: "log",
      level: "info",
      category: "USER_ACTION",
      label: `Navegación: ${pathname}`,
      detail: { pathname },
    });
  }, [active, pathname]);
}
