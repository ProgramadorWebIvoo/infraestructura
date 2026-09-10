/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store Zustand de tasas de cambio — reemplaza al Context de
 * ExchangeRatesProvider.tsx. Caché compartida para toda la sesión: un solo
 * fetch, todos los consumidores (BsAmount, tablas, cards) leen por selector
 * en vez de por Context, evitando re-render en cascada cuando cambia
 * cualquier campo del value.
 */

import { create } from "zustand";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ExchangeRateRecord } from "@/hooks/useExchangeRates";

export type { ExchangeRateRecord };

interface ExchangeRatesState {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  hasLoaded: boolean;
  load: (authToken: string) => Promise<void>;
}

export const useExchangeRatesStore = create<ExchangeRatesState>((set, get) => ({
  rates: [],
  isLoading: false,
  hasLoaded: false,

  load: async (authToken) => {
    if (!authToken || get().hasLoaded) return;
    set({ isLoading: true });
    try {
      const data = await apiFetch<ExchangeRateRecord[]>("/exchange-rates", { token: authToken });
      set({ rates: data ?? [], isLoading: false, hasLoaded: true });
    } catch (err) {
      logError("exchangeRatesStore.load", err);
      set({ isLoading: false, hasLoaded: true });
    }
  },
}));
