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
  ADMIN: [ROUTES.CONFIG_APP],
  PRESIDENCIA: [ROUTES.INFRAESTRUCTURA],
  INFRAESTRUCTURA: [ROUTES.AUDITORIA],
  AUDITORIA: [ROUTES.PROCURA],
  PROCURA: [ROUTES.ANALISTAS],
  ANALISTA: [ROUTES.PROCURA],
  FINANZAS: [ROUTES.AUDITORIA],
};

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

// Espera antes del primer prefetch (deja pasar el fetch inicial crítico) y
// entre los pasos posteriores del resto de rutas. Sin requestIdleCallback
// (Safari) el fallback usa setTimeout con estos mismos valores.
const FIRST_IDLE_DELAY_MS = 2000;
const NEXT_IDLE_DELAY_MS = 500;

/** Programa `cb` en idle (o con setTimeout de respaldo) y devuelve su cancelación. */
function scheduleIdle(cb: () => void, fallbackDelayMs: number, idleTimeoutMs: number): () => void {
  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(cb, { timeout: idleTimeoutMs });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const timer = setTimeout(cb, fallbackDelayMs);
  return () => clearTimeout(timer);
}

/**
 * Dispara una vez por `activeRole` (ej. si el usuario cambia de rol activo
 * en la sesión, vuelve a correr para el nuevo rol). Respeta `canAccess`:
 * nunca precarga una ruta que el usuario no puede ver (fail-closed, mismo
 * criterio que el sidebar).
 *
 * Orden: primero la ruta probable del rol, después el resto de rutas
 * accesibles, una por ciclo idle. Sin esto, cualquier módulo cuyo chunk no
 * estuviera cacheado hacía suspender `React.lazy` y el layout (fallback
 * `null`) dejaba la pantalla en blanco antes de que apareciera el skeleton.
 */
export function useIdleRoutePrefetch(activeRole: string | undefined, canAccess: (path: string) => boolean): void {
  const firedForRole = useRef<string | null>(null);
  const canAccessRef = useRef(canAccess);
  canAccessRef.current = canAccess;

  useEffect(() => {
    if (!activeRole || firedForRole.current === activeRole) return;
    firedForRole.current = activeRole;

    const likely = ROLE_LIKELY_NEXT[activeRole] ?? [];
    let cancelPending: () => void = () => {};

    const loadIfAllowed = (path: string) => {
      if (!canAccessRef.current(path)) return;
      ROUTE_PREFETCH[path]?.loadChunk().catch(() => {});
    };

    const loadRemaining = (queue: string[]) => {
      const [path, ...rest] = queue;
      if (path === undefined) return;
      loadIfAllowed(path);
      if (rest.length > 0) {
        cancelPending = scheduleIdle(() => loadRemaining(rest), NEXT_IDLE_DELAY_MS, 2000);
      }
    };

    const run = () => {
      likely.forEach(loadIfAllowed);
      const remaining = Object.keys(ROUTE_PREFETCH).filter((path) => !likely.includes(path));
      cancelPending = scheduleIdle(() => loadRemaining(remaining), NEXT_IDLE_DELAY_MS, 2000);
    };

    cancelPending = scheduleIdle(run, FIRST_IDLE_DELAY_MS, 4000);
    return () => cancelPending();
  }, [activeRole]);
}
