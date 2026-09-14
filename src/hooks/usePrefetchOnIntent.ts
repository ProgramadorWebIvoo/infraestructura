/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pre-fetching inteligente por intención del usuario (hover/focus), no por
 * historial de navegación: barato, predecible, y no requiere trackear ni
 * almacenar patrones de uso (ver discusión de diseño — se descartó
 * deliberadamente un sistema de "rutas más visitadas" por el costo de
 * mantenerlo sincronizado y el riesgo de prefetch equivocado). Reusa
 * `ROUTE_PREFETCH` (src/routes/prefetchRegistry.ts) para no duplicar los
 * `import()`/queryKey que ya existen — este hook solo decide CUÁNDO
 * dispararlos, no QUÉ precargar.
 *
 * Guardas de bajo consumo (por eso "optimizado" no es solo un adjetivo):
 * - Debounce de `HOVER_DELAY_MS`: un mouseover fugaz de paso (el cursor
 *   cruzando el link camino a otro lado) nunca dispara nada.
 * - Respeta `navigator.connection.saveData`/`effectiveType` — en modo ahorro
 *   de datos o 2G no se precarga nada, el usuario ya está optimizando por su
 *   cuenta.
 * - Respeta `document.hidden` — una pestaña en background no debe generar
 *   tráfico de red que el usuario ni está viendo.
 * - Semáforo module-level (`MAX_CONCURRENT_CHUNK_LOADS`): como máximo 2
 *   descargas de chunk JS en vuelo a la vez, para no competir con el fetch
 *   de la página activa si el usuario pasa el mouse por varios links rápido.
 * - `warmedChunks`: cada chunk se pide una sola vez por sesión de pestaña —
 *   `import()` del mismo specifier ya lo cachea el navegador/bundler, pero
 *   evitamos incluso la llamada redundante y su entrada en el semáforo.
 *
 * El prefetch de DATOS (`entry.prefetchData`) no pasa por el semáforo: usa
 * `queryClient.prefetchQuery`, que ya es un no-op si la query sigue "fresh"
 * (mismo `staleTime` que ya gobierna esa key) — no hay nada que deduplicar
 * acá que React Query no resuelva solo.
 */

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTE_PREFETCH } from "@/routes/prefetchRegistry";

const HOVER_DELAY_MS = 180;
const MAX_CONCURRENT_CHUNK_LOADS = 2;

let chunkLoadsInFlight = 0;
const warmedChunks = new Set<string>();

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

function shouldSkipForNetworkConditions(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
}

/**
 * Handlers listos para `onMouseEnter`/`onFocus`/`onMouseLeave` de un
 * `<NavLink to={path}>`. `authToken` es el sentinel en memoria de
 * `useAuth()` (no un secreto — ver useAuth.ts), usado solo para componer la
 * misma queryKey que ya arma `usePolledFetch`.
 */
export function usePrefetchOnIntent(path: string, authToken: string) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const trigger = useCallback(() => {
    cancel();
    const entry = ROUTE_PREFETCH[path];
    if (!entry || !authToken) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (document.hidden || shouldSkipForNetworkConditions()) return;

      if (!warmedChunks.has(path) && chunkLoadsInFlight < MAX_CONCURRENT_CHUNK_LOADS) {
        warmedChunks.add(path);
        chunkLoadsInFlight++;
        entry.loadChunk()
          .catch(() => warmedChunks.delete(path))
          .finally(() => { chunkLoadsInFlight = Math.max(0, chunkLoadsInFlight - 1); });
      }

      entry.prefetchData?.(queryClient, authToken);
    }, HOVER_DELAY_MS);
  }, [path, authToken, queryClient, cancel]);

  // Cancela el timer pendiente si el componente se desmonta a mitad del debounce.
  useEffect(() => cancel, [cancel]);

  return { onMouseEnter: trigger, onFocus: trigger, onMouseLeave: cancel, onBlur: cancel };
}

/** Solo para tests — el estado module-level persiste entre montajes a propósito, pero contamina tests que corren en el mismo proceso. */
export function __resetPrefetchStateForTests(): void {
  chunkLoadsInFlight = 0;
  warmedChunks.clear();
}
