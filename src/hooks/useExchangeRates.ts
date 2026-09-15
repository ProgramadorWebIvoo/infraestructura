/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trigger de sync manual de tasas de cambio (DolarVZLA API + BCV scraping
 * fallback) — exclusivo SUPERADMIN, usado desde ConfigAppPanel.
 *
 * Antes también mantenía su propio histórico (`rates`/`load()`) y su propia
 * suscripción Pusher a `.exchange-rates.updated` — duplicando por completo
 * lo que `ExchangeRatesProvider`/`exchangeRatesStore` ya cachea para toda la
 * sesión (confirmado en vivo: `/api/exchange-rates` y `/broadcasting/auth`
 * se pedían 2x al entrar a Config App). `ConfigAppPanel` nunca leía `rates`/
 * `hasLoaded`/`getByCode` de este hook — solo `isSyncing`/`syncNow` — así
 * que ese lado duplicado se eliminó sin perder funcionalidad; ver
 * PERFORMANCE-AUDIT-2026-09-15.md. La suscripción WS que refrescaba tras el
 * sync ahora vive en `ExchangeRatesProvider` (un solo canal por sesión).
 */

import { useCallback, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import { useExchangeRatesStore, type ExchangeRateRecord } from "@/stores/exchangeRatesStore";

export type { ExchangeRateRecord };

export interface SyncDebugTraceEntry {
  source: string;
  success: boolean;
  duration_ms: number;
  message: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  rates?: ExchangeRateRecord[];
  source?: string;
  debug?: SyncDebugTraceEntry[] | null;
}

export function useExchangeRates(authToken: string, enabled: boolean) {
  const [isSyncing, setIsSyncing] = useState(false);
  const refreshStore = useExchangeRatesStore(s => s.refresh);

  const syncNow = useCallback(async (): Promise<SyncResponse> => {
    if (!authToken || !enabled) throw new Error("Auth token required");
    setIsSyncing(true);
    try {
      const response = await apiFetch<SyncResponse>("/exchange-rates/sync", {
        method: "POST",
        token: authToken,
      });
      // Refresca el store compartido — toda la sesión ve las tasas nuevas,
      // no solo este panel.
      await refreshStore(authToken);
      return response || { success: false, message: "No response from server" };
    } catch (err) {
      logError("useExchangeRates.syncNow", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [authToken, enabled, refreshStore]);

  return { isSyncing, syncNow };
}
