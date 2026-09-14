/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Segunda señal del pre-fetching inteligente (además del hover/focus de
 * `usePrefetchOnIntent`): un ranking estático y chico de "siguiente ruta más
 * probable" por rol, precargado UNA sola vez por sesión autenticada, en
 * tiempo de inactividad del navegador (`requestIdleCallback`) — nunca
 * compite con el fetch inicial crítico (login, permisos, proyectos).
 *
 * Deliberadamente NO es un sistema de tracking de historial de navegación
 * real: eso requeriría almacenar/analizar patrones de uso por usuario, con
 * el costo de mantenimiento y el riesgo de prefetch mal calibrado que eso
 * implica. Este mapa es una heurística fija basada en el flujo de trabajo
 * documented del negocio (ej. un ANALISTA que entra suele ir después a
 * Procura a ver el resultado de sus comparativos) — barata, predecible, y
 * fácil de ajustar a mano si cambia el flujo real.
 *
 * Solo precarga el CHUNK JS (no datos): las vistas candidatas no tienen
 * `prefetchData` en `ROUTE_PREFETCH` hoy (reciben `projects`/`contractors`
 * como props globales, ver prefetchRegistry.ts), así que precargar el chunk
 * es la única ganancia real y la más barata (nunca dispara un GET extra).
 */

import { useEffect, useRef } from "react";
import { ROUTE_PREFETCH } from "@/routes/prefetchRegistry";
import { ROUTES } from "@/routes";

const ROLE_LIKELY_NEXT: Partial<Record<string, string[]>> = {
  SUPERADMIN: [ROUTES.PRESIDENCIA],
  ADMIN: [ROUTES.USUARIOS],
  PRESIDENCIA: [ROUTES.INFRAESTRUCTURA],
  INFRAESTRUCTURA: [ROUTES.CIERRE_OBRA],
  CIERRE_DE_OBRA: [ROUTES.PROCURA],
  PROCURA: [ROUTES.ANALISTAS],
  ANALISTA: [ROUTES.PROCURA],
  FINANZAS: [ROUTES.CIERRE_OBRA],
};

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

/**
 * Dispara una vez por `activeRole` (ej. si el usuario cambia de rol activo
 * en la sesión, vuelve a correr para el nuevo rol). Respeta `canAccess`:
 * nunca precarga una ruta que el usuario no puede ver (fail-closed, mismo
 * criterio que el sidebar).
 */
export function useIdleRoutePrefetch(activeRole: string | undefined, canAccess: (path: string) => boolean): void {
  const firedForRole = useRef<string | null>(null);
  const canAccessRef = useRef(canAccess);
  canAccessRef.current = canAccess;

  useEffect(() => {
    if (!activeRole || firedForRole.current === activeRole) return;
    firedForRole.current = activeRole;

    const run = () => {
      const candidates = ROLE_LIKELY_NEXT[activeRole] ?? [];
      for (const path of candidates) {
        if (!canAccessRef.current(path)) continue;
        ROUTE_PREFETCH[path]?.loadChunk().catch(() => {});
      }
    };

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 2000);
    }
  }, [activeRole]);
}
