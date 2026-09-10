/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Zustand de `GET /settings` — reemplaza al Context de
 * PublicSettingsProvider.tsx. Un solo fetch por sesión, cacheado en memoria;
 * usePollingSettings/useMaxAdvancePercent/useBudgetSemaphore leen de acá por
 * selector en vez de por Context. Sin revalidación automática (trade-off
 * aceptado a propósito, ver comentario original en PublicSettingsProvider).
 */

import { create } from "zustand";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export interface RawSetting {
  key: string;
  value: string | null;
}

export type SettingsByGroup = Record<string, RawSetting[]>;

interface PublicSettingsState {
  settings: SettingsByGroup;
  isLoading: boolean;
  hasLoaded: boolean;
  load: (authToken: string) => Promise<void>;
}

export const usePublicSettingsStore = create<PublicSettingsState>((set, get) => ({
  settings: {},
  isLoading: true,
  hasLoaded: false,

  load: async (authToken) => {
    if (!authToken || get().hasLoaded) return;
    try {
      const data = await apiFetch<SettingsByGroup>("/settings", { token: "authenticated" });
      set({ settings: data ?? {}, isLoading: false, hasLoaded: true });
    } catch (err) {
      logError("publicSettingsStore", err);
      set({ isLoading: false, hasLoaded: true });
    }
  },
}));
