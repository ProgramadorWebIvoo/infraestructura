/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Límites reales de subida del servidor (`GET /public/upload-limits`).
 * Endpoint público (también lo usan los portales sin sesión) con
 * `throttle:public-api` de 10/min por IP, así que se pide UNA vez por sesión y
 * cacheado; si falla (red, 429) se reintenta como máximo cada minuto y,
 * mientras tanto, los selectores usan los ajustes de la app como respaldo.
 */

import { create } from "zustand";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export interface UploadLimits {
  /** Tamaño máximo sumado de una petición; `null` si PHP no tiene límite. */
  postMaxBytes: number | null;
  uploadMaxBytes: number | null;
  maxFileUploads: number;
  /** Peso máximo por archivo: min(ajuste de la app, límites de PHP). */
  maxFileBytes: number;
  /** Cantidad máxima de archivos por carga: min(ajuste de la app, `max_file_uploads`). */
  maxFileCount: number;
}

const RETRY_AFTER_FAILURE_MS = 60_000;

interface UploadLimitsState {
  limits: UploadLimits | null;
  isLoading: boolean;
  retryAt: number;
  load: () => Promise<void>;
}

export const useUploadLimitsStore = create<UploadLimitsState>((set, get) => ({
  limits: null,
  isLoading: false,
  retryAt: 0,

  load: async () => {
    const { limits, isLoading, retryAt } = get();
    if (limits || isLoading || Date.now() < retryAt) return;

    set({ isLoading: true });
    try {
      const data = await apiFetch<UploadLimits>("/public/upload-limits");
      set({ limits: data ?? null, isLoading: false, retryAt: data ? 0 : Date.now() + RETRY_AFTER_FAILURE_MS });
    } catch (err) {
      logError("uploadLimitsStore", err);
      set({ isLoading: false, retryAt: Date.now() + RETRY_AFTER_FAILURE_MS });
    }
  },
}));
