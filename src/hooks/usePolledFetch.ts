import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { logError } from "../services/logger";
import type { ShowToast } from "./useProjects";
import { DEFAULT_POLL_INTERVAL } from "../constants";

interface UsePolledFetchOptions<T> {
  authToken: string;
  showToast: ShowToast;
  /**
   * Identidad de caché de TanStack Query para este recurso (ej.
   * `["contractors"]`). Se combina con `authToken` internamente. Si dos
   * componentes montan el mismo `queryKey` a la vez, comparten un solo
   * fetch/polling en vez de duplicarlo — ese es el problema que esta
   * migración resuelve (ver diagnóstico de performance del plan).
   */
  queryKey: QueryKey;
  /** Función que hace el fetch. Debe ser estable (memoizada por el caller). */
  fetcher: () => Promise<T[]>;
  /** Produce una firma para dedup. Se llama solo con datos fresh. */
  getSignature: (data: T[]) => string;
  /** Mensaje de error cuando el fetch falla (solo en carga inicial, no en poll). */
  errorMessage: string;
  /** Intervalo de polling en ms. Default: DEFAULT_POLL_INTERVAL. */
  interval?: number;
}

interface UsePolledFetchResult<T> {
  data: T[];
  setData: (updater: T[] | ((prev: T[]) => T[])) => void;
  isLoading: boolean;
  /** Fuerza recarga inmediata (fuera del ciclo de poll). */
  refresh: () => void;
}

/**
 * Hook genérico para datos vía API con polling, dedup por firma,
 * reset de loading en login y manejo silencioso de errores en poll.
 *
 * Migrado a TanStack Query: el fetch+polling+caché vive en el QueryClient
 * de la app (`queryKey` = [...queryKey, authToken]) en vez de un `setState`
 * + `setTimeout` privado por instancia del hook — mismo comportamiento
 * observable (dedupe por firma, silencioso en poll, toast solo en la carga
 * inicial), pero compartido entre componentes que usen el mismo recurso.
 *
 * No cubre el caso de múltiples arrays en paralelo (ej. useProjectsData).
 */
export function usePolledFetch<T>({
  authToken,
  showToast,
  queryKey,
  fetcher,
  getSignature,
  errorMessage,
  interval = DEFAULT_POLL_INTERVAL,
}: UsePolledFetchOptions<T>): UsePolledFetchResult<T> {
  const queryClient = useQueryClient();
  const enabled = !!authToken;
  const fullKey: QueryKey = [...queryKey, authToken];

  // Refs estables para no recrear queryFn ni invalidar la queryKey en cada
  // render por callers que pasan funciones/strings inline (mismo patrón que
  // el resto de hooks de este archivo/proyecto).
  const fullKeyRef = useRef(fullKey);
  fullKeyRef.current = fullKey;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const errorMessageRef = useRef(errorMessage);
  errorMessageRef.current = errorMessage;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const getSignatureRef = useRef(getSignature);
  getSignatureRef.current = getSignature;
  const lastSig = useRef("");

  const query = useQuery({
    queryKey: fullKey,
    queryFn: async () => {
      const result = await fetcherRef.current();
      const sig = getSignatureRef.current(result);
      if (sig === lastSig.current) {
        // dedupe: mismos datos que la última carga — reusa la referencia
        // en caché para no disparar re-renders en consumidores que
        // dependan de identidad (mismo comportamiento que el signature
        // dedupe original).
        const cached = queryClient.getQueryData<T[]>(fullKeyRef.current);
        if (cached) return cached;
      }
      lastSig.current = sig;
      return result;
    },
    enabled,
    refetchInterval: enabled ? interval : false,
    staleTime: Math.max(interval - 5000, 0),
    retry: false,
  });

  // Toast + log solo en la carga inicial (sin data todavía) — un poll
  // fallido en background no vuelve a dejar la query en estado "error sin
  // data" mientras haya una carga previa exitosa en caché, así que este
  // efecto no se re-dispara en cada tick fallido (silencioso en poll).
  useEffect(() => {
    if (!enabled || !query.isError) return;
    logError("usePolledFetch", query.error);
    showToastRef.current(errorMessageRef.current, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, query.isError]);

  const setData = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    queryClient.setQueryData<T[]>(fullKeyRef.current, (prev = []) =>
      typeof updater === "function" ? (updater as (p: T[]) => T[])(prev) : updater);
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.refetchQueries({ queryKey: fullKeyRef.current, exact: true });
  }, [queryClient]);

  return {
    data: query.data ?? [],
    setData,
    isLoading: query.isPending && enabled,
    refresh,
  };
}
