/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo de monedas aceptadas (CONFIG APP, exclusivo SUPERADMIN). A
 * diferencia de AppSetting/notification-rules, cada acción se persiste de
 * inmediato (alta/edición/activar-desactivar/moneda base/eliminar) — no pasa
 * por la barra "Guardar todo": es un CRUD de catálogo, no un valor con
 * draft/dirty.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";
import type { ConfigAuditLogRecord } from "./useConfigAuditLogs";

export interface CurrencyRecord {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Respuesta de POST/PATCH /currencies: la moneda + el registro de auditoría
 *  recién creado, mismo patrón que UpdateSettingResponse en useAppSettings —
 *  el panel de auditoría lo inserta directo sin re-consultar /config-audit-logs. */
export type CurrencyMutationResponse = CurrencyRecord & { auditLog?: ConfigAuditLogRecord };

export function useCurrencies(authToken: string, enabled: boolean) {
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<CurrencyRecord[]>("/currencies", { token: authToken });
      setCurrencies(data ?? []);
    } catch (err) {
      logError("useCurrencies.load", err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled && !hasLoaded) load();
  }, [enabled, hasLoaded, load]);

  const addCurrency = useCallback(
    async (input: { code: string; name: string; symbol: string }): Promise<CurrencyMutationResponse> => {
      const created = await apiFetch<CurrencyMutationResponse>("/currencies", {
        method: "POST",
        body: JSON.stringify(input),
        token: authToken,
      });
      setCurrencies(prev => [...prev, created]);
      return created;
    },
    [authToken],
  );

  const updateCurrency = useCallback(
    async (id: number, input: Partial<Pick<CurrencyRecord, "name" | "symbol" | "is_active">>): Promise<CurrencyMutationResponse> => {
      const updated = await apiFetch<CurrencyMutationResponse>(`/currencies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
        token: authToken,
      });
      setCurrencies(prev => prev.map(c => (c.id === id ? updated : c)));
      return updated;
    },
    [authToken],
  );

  const setBaseCurrency = useCallback(
    async (id: number): Promise<CurrencyMutationResponse> => {
      const updated = await apiFetch<CurrencyMutationResponse>(`/currencies/${id}/set-base`, {
        method: "POST",
        token: authToken,
      });
      setCurrencies(prev => prev.map(c => ({ ...c, is_base: c.id === id })));
      return updated;
    },
    [authToken],
  );

  const deleteCurrency = useCallback(
    async (id: number): Promise<{ auditLog?: ConfigAuditLogRecord }> => {
      const result = await apiFetch<{ auditLog?: ConfigAuditLogRecord }>(`/currencies/${id}`, {
        method: "DELETE",
        token: authToken,
      });
      setCurrencies(prev => prev.filter(c => c.id !== id));
      return result;
    },
    [authToken],
  );

  return { currencies, isLoading, addCurrency, updateCurrency, setBaseCurrency, deleteCurrency };
}
