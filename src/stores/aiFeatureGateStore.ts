/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Zustand de `GET /ai/feature-toggles` — mismo patrón que
 * publicSettingsStore.ts: un solo fetch por sesión, compartido por toda la
 * app, sin revalidación automática (el toggle es una acción rara de
 * SUPERADMIN; cuando ocurre, un refresh de página basta). Consumido por
 * useAiFeatureGate() para decidir si un botón/sección de IA se renderiza.
 */

import { create } from "zustand";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export interface AiFeatureMatrixEntry {
  master: boolean;
  actions: Record<string, boolean>;
}

export type AiFeatureMatrix = Record<string, AiFeatureMatrixEntry>;

interface AiFeatureGateState {
  matrix: AiFeatureMatrix;
  isLoading: boolean;
  hasLoaded: boolean;
  load: (authToken: string) => Promise<void>;
}

export const useAiFeatureGateStore = create<AiFeatureGateState>((set, get) => ({
  matrix: {},
  isLoading: true,
  hasLoaded: false,

  load: async (authToken) => {
    if (!authToken || get().hasLoaded) return;
    try {
      const data = await apiFetch<{ matrix: AiFeatureMatrix }>("/ai/feature-toggles", { token: "authenticated" });
      set({ matrix: data?.matrix ?? {}, isLoading: false, hasLoaded: true });
    } catch (err) {
      logError("aiFeatureGateStore", err);
      set({ isLoading: false, hasLoaded: true });
    }
  },
}));
