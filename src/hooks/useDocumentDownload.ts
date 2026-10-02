/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Descarga de documentos con el comportamiento unificado que antes cada
 * pantalla repetía a mano: ignora el doble clic mientras la misma descarga está
 * en curso, expone "ocupado" por documento (para deshabilitar el botón) y
 * muestra UN toast de error con el mensaje real del fallo ("El archivo ya no
 * existe en el servidor", "No tienes permiso…") en vez de un genérico. Cancelar
 * desde el dock avisa con un toast informativo, no de error.
 */

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/UI/Toast";
import { isRequestCanceled } from "@ivoo/shared/cancel";
import { downloadProjectDocument } from "@/services/api";
import { getErrorMessage } from "@/services/logger";
import type { ProjectDocument } from "@/types";

const DEFAULT_ERROR = "No se pudo descargar el archivo.";

/** Descarga genérica: `key` identifica el documento (misma clave = misma descarga). */
export function useDocumentDownload() {
  const { showToast } = useToast();
  // Ref síncrona: dos clics en el mismo tick llegan antes de que el estado se actualice.
  const active = useRef(new Set<string>());
  const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(new Set());

  const run = useCallback(
    async (key: string, task: () => Promise<void>, fallbackMessage = DEFAULT_ERROR): Promise<void> => {
      if (active.current.has(key)) return;
      active.current.add(key);
      setBusyKeys(new Set(active.current));

      try {
        await task();
      } catch (error) {
        if (isRequestCanceled(error)) showToast("Descarga cancelada.", "info");
        else showToast(getErrorMessage(error, fallbackMessage), "error");
      } finally {
        active.current.delete(key);
        setBusyKeys(new Set(active.current));
      }
    },
    [showToast],
  );

  const isBusy = useCallback((key: string) => busyKeys.has(key), [busyKeys]);

  return { run, isBusy };
}

type DownloadableDocument = Pick<ProjectDocument, "id" | "originalName">;

/** Descarga de documentos de un proyecto (la mayoría de las pantallas). */
export function useProjectDocumentDownload(authToken: string) {
  const { run, isBusy } = useDocumentDownload();

  const download = useCallback(
    (projectId: string, doc: DownloadableDocument, fallbackMessage?: string) =>
      run(`project:${projectId}:${doc.id}`, () => downloadProjectDocument(projectId, doc, authToken), fallbackMessage),
    [run, authToken],
  );

  const isDownloading = useCallback((projectId: string, documentId: number) => isBusy(`project:${projectId}:${documentId}`), [isBusy]);

  return { download, isDownloading };
}
