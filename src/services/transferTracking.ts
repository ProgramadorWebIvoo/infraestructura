/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registra una subida en `transferStore` y devuelve las opciones que `apiFetch`
 * (shared) necesita para reportar fase, bytes y reintentos, más una señal
 * propia para poder cancelarla desde el dock. Compone con los callbacks y la
 * señal que el caller ya pasara: nada de lo suyo se pierde.
 */

import type { TransferProgress } from "@ivoo/shared";
import { useTransferStore, type TransferPhase } from "@/stores/transferStore";

export const DEFAULT_TRANSFER_LABEL = "Subiendo archivos";

export interface TrackUploadOptions {
  label?: string;
  /** Señal del caller: si la aborta, la subida se cancela igual que desde el dock. */
  signal?: AbortSignal | null;
  onPhase?: (phase: TransferPhase) => void;
  onUploadProgress?: (progress: TransferProgress) => void;
  onRetry?: (attempt: number) => void;
}

export interface TrackedUpload {
  signal: AbortSignal;
  setPhase: (phase: TransferPhase) => void;
  onUploadProgress: (progress: TransferProgress) => void;
  onRetry: (attempt: number) => void;
  /** Lanza si ya se canceló (p. ej. durante `preparing`, que no es abortable por sí misma). */
  throwIfCanceled: () => void;
  /** Quita la subida del dock y desengancha la señal del caller. Llamar siempre (finally). */
  finish: () => void;
}

export function trackUpload(options: TrackUploadOptions): TrackedUpload {
  const controller = new AbortController();
  const abort = () => controller.abort();

  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });

  const store = useTransferStore.getState();
  const id = store.start(options.label ?? DEFAULT_TRANSFER_LABEL, abort);

  const update = useTransferStore.getState().update;

  return {
    signal: controller.signal,

    setPhase: (phase) => {
      update(id, { phase });
      options.onPhase?.(phase);
    },

    onUploadProgress: (progress) => {
      update(id, { loaded: progress.loaded, total: progress.total });
      options.onUploadProgress?.(progress);
    },

    onRetry: (attempt) => {
      // Un reintento automático vuelve a enviar los bytes desde cero.
      update(id, { retryAttempt: attempt, loaded: 0, phase: "uploading" });
      options.onRetry?.(attempt);
      options.onPhase?.("uploading");
    },

    throwIfCanceled: () => {
      if (controller.signal.aborted) throw new DOMException("Operación cancelada.", "AbortError");
    },

    finish: () => {
      options.signal?.removeEventListener("abort", abort);
      useTransferStore.getState().finish(id);
    },
  };
}
