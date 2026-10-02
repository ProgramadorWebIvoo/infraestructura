/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validación de archivos reutilizable para CUALQUIER selector (FileDropZone,
 * fotos de cierre, imagen de propuesta, documentos de proveedor…): aplica
 * `validateFiles` con las reglas dadas, avisa cada rechazo con su motivo y
 * devuelve la lista resultante. Sin JSX ni estado propio: el selector sigue
 * dueño de su UI y de su lista de archivos.
 */

import { useCallback } from "react";
import { validateFiles, type FileRules } from "@/utils/fileRules";

export interface UseFileValidationOptions extends FileRules {
  /** Se llama una vez por archivo rechazado, con el motivo en español. */
  onRejected?: (fileName: string, reason: string) => void;
}

export function useFileValidation({ accept, maxSizeBytes, maxFileCount, maxTotalBytes, onRejected }: UseFileValidationOptions) {
  /** Devuelve `existing` + los `incoming` aceptados; cada rechazo se notifica por `onRejected`. */
  const validate = useCallback(
    (incoming: File[], existing: File[] = []): File[] => {
      const { merged, rejected } = validateFiles(incoming, existing, { accept, maxSizeBytes, maxFileCount, maxTotalBytes });
      rejected.forEach(({ name, reason }) => onRejected?.(name, reason));
      return merged;
    },
    [accept, maxSizeBytes, maxFileCount, maxTotalBytes, onRejected],
  );

  return { validate };
}
