/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Historial de sincronizaciones de tasas de cambio (para auditoría).
 * Permite obtener logs y última ejecución exitosa.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export interface SyncLog {
  id: number;
  status: "SUCCESS" | "FAILURE";
  source: string | null;
  rates_synced: number;
  error_message: string | null;
  executed_at: string;
  created_at: string;
  updated_at: string;
}

export function useExchangeRateSyncLogs(authToken: string, enabled: boolean) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<SyncLog[]>("/exchange-rates/sync-logs", {
        token: authToken,
      });
      setLogs(data ?? []);
    } catch (err) {
      logError("useExchangeRateSyncLogs.loadLogs", err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, enabled]);

  const loadLastSync = useCallback(async () => {
    if (!authToken || !enabled) return;
    try {
      const data = await apiFetch<SyncLog | null>("/exchange-rates/last-sync", {
        token: authToken,
      });
      setLastSync(data ?? null);
    } catch (err) {
      logError("useExchangeRateSyncLogs.loadLastSync", err);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled) {
      loadLogs();
      loadLastSync();
    }
  }, [enabled, loadLogs, loadLastSync]);

  return {
    logs,
    lastSync,
    isLoading,
    loadLogs,
    loadLastSync,
  };
}
