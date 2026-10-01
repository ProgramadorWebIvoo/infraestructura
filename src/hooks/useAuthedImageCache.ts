import { useCallback, useEffect, useRef } from "react";
import { apiDownload } from "@/services/api";
import { createTaskQueue, type TaskRunner } from "@/utils/taskQueue";

interface ImageStore {
  urls: Map<string, string>;
  inflight: Map<string, Promise<string>>;
  run: TaskRunner;
  disposed: boolean;
}

/**
 * Descarga imágenes protegidas por auth como blob y las deja en caché mientras
 * el componente que usa el hook siga montado (al desmontar se liberan los
 * object URLs). Las descargas van en una cola de pocas a la vez, y una imagen
 * que ya no se necesita (la fila se desmontó al cambiar de página) no se
 * descarga si todavía no había empezado.
 *
 * `load` devuelve el object URL; rechaza si la descarga falla o el hook se
 * desmontó. `isCancelled` se consulta justo antes de iniciar la descarga.
 */
export function useAuthedImageCache(authToken: string, maxConcurrent = 4) {
  const store = useRef<ImageStore | null>(null);
  if (store.current === null) {
    store.current = { urls: new Map(), inflight: new Map(), run: createTaskQueue(maxConcurrent), disposed: false };
  }

  useEffect(() => {
    const current = store.current!;
    current.disposed = false;
    return () => {
      current.disposed = true;
      current.urls.forEach((url) => URL.revokeObjectURL(url));
      current.urls.clear();
      current.inflight.clear();
    };
  }, []);

  return useCallback(
    (imagePath: string, isCancelled?: () => boolean): Promise<string> => {
      const s = store.current!;
      const cached = s.urls.get(imagePath);
      if (cached) return Promise.resolve(cached);
      const pending = s.inflight.get(imagePath);
      if (pending) return pending;

      const request = s
        .run(async () => {
          if (isCancelled?.() || s.disposed) throw new Error("cancelled");
          const blob = await apiDownload(`/supplier-proposal-images/${imagePath.replace(/^supplier-proposal-images\//, "")}`, { token: authToken });
          const url = URL.createObjectURL(blob);
          if (s.disposed) {
            URL.revokeObjectURL(url);
            throw new Error("disposed");
          }
          s.urls.set(imagePath, url);
          return url;
        })
        .finally(() => {
          s.inflight.delete(imagePath);
        });
      s.inflight.set(imagePath, request);
      return request;
    },
    [authToken],
  );
}
