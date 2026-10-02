/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registra una subida o descarga en `transferStore` y devuelve lo que
 * `apiFetch`/`apiDownload` (shared) necesitan para reportar fase, bytes y
 * reintentos, más una señal propia para poder cancelarla desde el dock.
 * Compone con los callbacks y la señal que el caller ya pasara: nada de lo
 * suyo se pierde.
 */

import type { TransferProgress } from "@ivoo/shared";
import { useTransferStore, type TransferKind, type TransferPhase } from "@/stores/transferStore";

export const DEFAULT_TRANSFER_LABEL = "Subiendo archivos";

export interface TrackTransferOptions {
  label?: string;
  /** Señal del caller: si la aborta, la transferencia se cancela igual que desde el dock. */
  signal?: AbortSignal | null;
  onPhase?: (phase: TransferPhase) => void;
  onProgress?: (progress: TransferProgress) => void;
  onRetry?: (attempt: number) => void;
}

export interface TrackedTransfer {
  signal: AbortSignal;
  setPhase: (phase: TransferPhase) => void;
  onProgress: (progress: TransferProgress) => void;
  onRetry: (attempt: number) => void;
  /** Lanza si ya se canceló (p. ej. durante `preparing`, que no es abortable por sí misma). */
  throwIfCanceled: () => void;
  /** Quita la transferencia del dock y desengancha la señal del caller. Llamar siempre (finally). */
  finish: () => void;
}

function trackTransfer(kind: TransferKind, options: TrackTransferOptions): TrackedTransfer {
  const controller = new AbortController();
  const abort = () => controller.abort();

  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });

  const sendingPhase: TransferPhase = kind === "upload" ? "uploading" : "downloading";
  const id = useTransferStore.getState().start(kind, options.label ?? DEFAULT_TRANSFER_LABEL, abort);
  const update = useTransferStore.getState().update;

  return {
    signal: controller.signal,

    setPhase: (phase) => {
      update(id, { phase });
      options.onPhase?.(phase);
    },

    onProgress: (progress) => {
      update(id, { loaded: progress.loaded, total: progress.total });
      options.onProgress?.(progress);
    },

    onRetry: (attempt) => {
      // Un reintento automático vuelve a mover los bytes desde cero.
      update(id, { retryAttempt: attempt, loaded: 0, phase: sendingPhase });
      options.onRetry?.(attempt);
      options.onPhase?.(sendingPhase);
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

export const trackUpload = (options: TrackTransferOptions) => trackTransfer("upload", options);
export const trackDownload = (options: TrackTransferOptions) => trackTransfer("download", options);
