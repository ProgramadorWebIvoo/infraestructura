/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Subidas de archivos en curso (fase, bytes enviados, reintentos, cancelar).
 * Lo alimenta el wrapper de `apiFetch` para TODA subida de la app, así que
 * `TransferDock` puede mostrar progreso y "Cancelar" aunque quien subió sea un
 * hook de workflow sin UI propia. Store global (como toastStore): también es
 * invocable fuera de React.
 */

import { create } from "zustand";

/**
 * Fases de una subida: revisión/optimización de archivos en el navegador →
 * envío de bytes → el servidor recibió todo y lo procesa (escáner, compresión).
 * En `processing` ya no tiene sentido cancelar: el servidor puede terminar la
 * operación igual.
 */
export type TransferPhase = "preparing" | "uploading" | "processing";

export interface Transfer {
  id: number;
  label: string;
  phase: TransferPhase;
  loaded: number;
  /** Desconocido si el navegador no puede calcularlo. */
  total?: number;
  /** 0 = primer intento; n = n-ésimo reintento automático. */
  retryAttempt: number;
  startedAt: number;
  cancel: () => void;
}

interface TransferState {
  transfers: Transfer[];
  start: (label: string, cancel: () => void) => number;
  update: (id: number, patch: Partial<Pick<Transfer, "phase" | "loaded" | "total" | "retryAttempt">>) => void;
  finish: (id: number) => void;
}

let nextId = 1;

export const useTransferStore = create<TransferState>((set) => ({
  transfers: [],

  start: (label, cancel) => {
    const id = nextId++;
    set((state) => ({
      transfers: [...state.transfers, { id, label, phase: "preparing", loaded: 0, retryAttempt: 0, startedAt: Date.now(), cancel }],
    }));
    return id;
  },

  update: (id, patch) =>
    set((state) => ({ transfers: state.transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  finish: (id) => set((state) => ({ transfers: state.transfers.filter((t) => t.id !== id) })),
}));
