/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sesión importada en modo REVISIÓN (solo lectura). Es un buffer SEPARADO del
 * de captura en vivo: pushDebugEntry nunca escribe aquí y la captura en vivo
 * sigue su curso por debajo. Vive solo en memoria y se descarta al cerrar el
 * panel (ver DebugPanel.tsx).
 */

import { create } from "zustand";
import type { DebugSession } from "@/utils/debugSession";

interface DebugReviewState {
  session: DebugSession | null;
  open: (session: DebugSession) => void;
  close: () => void;
}

export const useDebugReviewStore = create<DebugReviewState>((set) => ({
  session: null,
  open: (session) => set({ session }),
  close: () => set({ session: null }),
}));
