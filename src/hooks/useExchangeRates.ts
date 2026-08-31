/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico de tasas de cambio sincronizadas (DolarVZLA API + BCV scraping fallback)
 * Permite obtener el histórico, filtrar por moneda, y triggear sync manual.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export interface ExchangeRateRecord {
  id: number;
  currency_code: string;
  rate_to_usd: number;
  source: "DOLARVZLA_API" | "BCV_SCRAPING";
  effective_at: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  rates?: ExchangeRateRecord[];
  source?: string;
}

export function useExchangeRates(authToken: string, enabled: boolean) {
  const [rates, setRates] = useState<ExchangeRateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<ExchangeRateRecord[]>("/exchange-rates", { token: authToken });
      setRates(data ?? []);
    } catch (err) {
      logError("useExchangeRates.load", err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled && !hasLoaded) load();
  }, [enabled, hasLoaded, load]);

  const syncNow = useCallback(async (): Promise<SyncResponse> => {
    if (!authToken) throw new Error("Auth token required");
    setIsSyncing(true);
    try {
      const response = await apiFetch<SyncResponse>("/exchange-rates/sync", {
        method: "POST",
        token: authToken,
      });
      // Recargar histórico después del sync
      await load();
      return response || { success: false, message: "No response from server" };
    } catch (err) {
      logError("useExchangeRates.syncNow", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [authToken, load]);

  const getByCode = useCallback(
    (code: string): ExchangeRateRecord[] => {
      return rates.filter(r => r.currency_code === code).sort((a, b) => new Date(b.effective_at).getTime() - new Date(a.effective_at).getTime());
    },
    [rates],
  );

  return {
    rates,
    isLoading,
    isSyncing,
    hasLoaded,
    load,
    syncNow,
    getByCode,
  };
}
