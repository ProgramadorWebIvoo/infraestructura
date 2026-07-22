import { useState, useEffect, useCallback, useRef } from "react";
import { usePolling } from "./usePolling";
import type { ShowToast } from "./useProjects";

interface UsePolledFetchOptions<T> {
  authToken: string;
  showToast: ShowToast;
  /** Función que hace el fetch. Debe ser estable (memoizada por el caller). */
  fetcher: () => Promise<T[]>;
  /** Produce una firma para dedup. Se llama solo con datos fresh. */
  getSignature: (data: T[]) => string;
  /** Mensaje de error cuando el fetch falla (solo en carga inicial, no en poll). */
  errorMessage: string;
  /** Intervalo de polling en ms. */
  interval: number;
}

interface UsePolledFetchResult<T> {
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  isLoading: boolean;
  /** Fuerza recarga inmediata (fuera del ciclo de poll). */
  refresh: () => void;
}

/**
 * Hook genérico para datos vía API con polling, dedup por firma,
 * reset de loading en login y manejo silencioso de errores en poll.
 *
 * No cubre el caso de múltiples arrays en paralelo (ej. useProjectsData).
 */
export function usePolledFetch<T>({
  authToken,
  showToast,
  fetcher,
  getSignature,
  errorMessage,
  interval,
}: UsePolledFetchOptions<T>): UsePolledFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lastSig = useRef("");
  const prevToken = useRef(authToken);

  // Refencias para evitar dependencias en loadData
  const fetcherRef = useRef(fetcher);
  const getSignatureRef = useRef(getSignature);
  const errorMessageRef = useRef(errorMessage);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);
  useEffect(() => { getSignatureRef.current = getSignature; }, [getSignature]);
  useEffect(() => { errorMessageRef.current = errorMessage; }, [errorMessage]);

  // Resetear loading cuando el token pasa de falsy → truthy (login)
  useEffect(() => {
    if (!prevToken.current && authToken) {
      setIsLoading(true);
    }
    prevToken.current = authToken;
  }, [authToken]);

  // Carga interna (acepta flag isPoll para comportamiento distinto)
  const internalLoad = useCallback(async (opts?: { isPoll?: boolean }) => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await fetcherRef.current();
      const sig = getSignatureRef.current(result);
      if (opts?.isPoll && sig === lastSig.current) return; // dedupe
      lastSig.current = sig;
      setData(result);
    } catch (error) {
      if (opts?.isPoll) return; // silencioso en poll
      console.error(error);
      showToast(errorMessageRef.current, "error");
    } finally {
      if (!opts?.isPoll) setIsLoading(false);
    }
  }, [authToken, showToast]);

  // Carga inicial
  useEffect(() => {
    internalLoad();
  }, [internalLoad]);

  // Polling
  usePolling(
    useCallback(() => internalLoad({ isPoll: true }), [internalLoad]),
    interval,
    !!authToken,
  );

  const refresh = useCallback(() => {
    internalLoad();
  }, [internalLoad]);

  return { data, setData, isLoading, refresh };
}
