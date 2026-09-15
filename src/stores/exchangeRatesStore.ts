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

export interface ExchangeRateRecord {
  id: number;
  currency_code: string;
  rate_to_usd: number;
  source: "DOLARVZLA_API" | "BCV_SCRAPING";
  effective_at: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

interface ExchangeRatesState {
  rates: ExchangeRateRecord[];
  isLoading: boolean;
  hasLoaded: boolean;
  load: (authToken: string) => Promise<void>;
  /**
   * Fuerza un re-fetch ignorando `hasLoaded` — a diferencia de `load()`
   * (gateado a una sola vez por sesión). Usado tras un sync manual
   * (`useExchangeRates.syncNow`) o un evento Pusher `.exchange-rates.updated`
   * (ver `ExchangeRatesProvider`), donde el dato en caché quedó desactualizado
   * a propósito y hay que traer el nuevo.
   */
  refresh: (authToken: string) => Promise<void>;
}

async function fetchAndSet(authToken: string, set: (partial: Partial<ExchangeRatesState>) => void) {
  if (!authToken) return;
  set({ isLoading: true });
  try {
    const data = await apiFetch<ExchangeRateRecord[]>("/exchange-rates", { token: authToken });
    set({ rates: data ?? [], isLoading: false, hasLoaded: true });
  } catch (err) {
    logError("exchangeRatesStore.load", err);
    set({ isLoading: false, hasLoaded: true });
  }
}

export const useExchangeRatesStore = create<ExchangeRatesState>((set, get) => ({
  rates: [],
  isLoading: false,
  hasLoaded: false,

  load: async (authToken) => {
    if (!authToken || get().hasLoaded) return;
    await fetchAndSet(authToken, set);
  },

  refresh: async (authToken) => {
    await fetchAndSet(authToken, set);
  },
}));
