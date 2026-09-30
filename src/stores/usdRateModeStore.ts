/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modo de la tasa USD→Bs. con la que se muestran los montos en bolívares:
 * "BCV" (oficial, por defecto) o "USDT" (paralelo). Preferencia por
 * navegador, persistida entre sesiones. Store aparte de exchangeRatesStore
 * (SRP): aquel es caché de datos del servidor, este es preferencia de UI.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type UsdRateMode = "BCV" | "USDT";

export const DEFAULT_USD_RATE_MODE: UsdRateMode = "BCV";

interface UsdRateModeState {
  mode: UsdRateMode;
  setMode: (mode: UsdRateMode) => void;
}

// localStorage puede lanzar (ventana privada, datos bloqueados): degrada a
// modo en memoria en vez de romper el render.
const safeStorage = createJSONStorage<Pick<UsdRateModeState, "mode">>(() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
});

export const useUsdRateModeStore = create<UsdRateModeState>()(
  persist(
    (set) => ({
      mode: DEFAULT_USD_RATE_MODE,
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "ivoo.usdRateMode",
      storage: safeStorage,
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
