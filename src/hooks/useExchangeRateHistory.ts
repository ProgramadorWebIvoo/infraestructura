/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico completo de tasas (`GET /exchange-rates/{code}/history`, hasta
 * 200 registros por moneda ordenados por `effective_at` desc) — distinto de
 * `exchangeRatesStore`, que solo cachea la ÚLTIMA tasa por moneda para
 * conversión en vivo (BsAmount, etc.). Exclusivo SUPERADMIN, usado desde
 * ConfigAppPanel > Monedas para ver la evolución día a día.
 *
 * Trae el histórico de TODAS las monedas pasadas (no solo una a la vez) y
 * las combina en una sola lista ordenada por fecha — la versión anterior
 * pedía una moneda por vez detrás de un selector, lo que hacía parecer que
 * "faltaban" registros cuando en realidad eran de otra moneda no
 * seleccionada.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ExchangeRateRecord } from "@/stores/exchangeRatesStore";

export function useExchangeRateHistory(authToken: string, currencyCodes: string[], enabled: boolean) {
  const [history, setHistory] = useState<ExchangeRateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const codesKey = currencyCodes.join(",");

  const load = useCallback(async () => {
    if (!authToken || !enabled || currencyCodes.length === 0) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    try {
      const results = await Promise.all(
        currencyCodes.map(code =>
          apiFetch<ExchangeRateRecord[]>(`/exchange-rates/${code}/history`, { token: authToken }).catch(err => {
            logError("useExchangeRateHistory.load", err);
            return [] as ExchangeRateRecord[];
          }),
        ),
      );
      const merged = results.flat().sort((a, b) => b.effective_at.localeCompare(a.effective_at));
      setHistory(merged);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, enabled, codesKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, isLoading, reload: load };
}
