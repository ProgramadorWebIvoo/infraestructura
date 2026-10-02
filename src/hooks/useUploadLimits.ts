/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Límites de subida efectivos para los selectores de archivo: los del
 * servidor (`uploadLimitsStore`) si ya llegaron; si no, los ajustes de la app
 * (`useAppGroupSettings`). Dispara la carga una sola vez por sesión.
 */

import { useEffect } from "react";
import { useAppGroupSettings } from "@/hooks/useAppGroupSettings";
import { useUploadLimitsStore } from "@/stores/uploadLimitsStore";

export interface EffectiveUploadLimits {
  maxFileSizeBytes: number;
  maxFileCount: number;
  /** Peso máximo sumado por envío; `0` = sin límite o aún desconocido. */
  maxTotalBytes: number;
}

export function useUploadLimits(): EffectiveUploadLimits {
  const app = useAppGroupSettings();
  const server = useUploadLimitsStore(s => s.limits);
  const load = useUploadLimitsStore(s => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    maxFileSizeBytes: server?.maxFileBytes ?? app.maxFileSizeBytes,
    maxFileCount: server?.maxFileCount ?? app.maxFileCount,
    maxTotalBytes: server?.postMaxBytes ?? 0,
  };
}
