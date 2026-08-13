/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Historial de cambios de CONFIG APP — exclusivo de SUPERADMIN. Separado de
 * useAuditLogs (auditoría de proyectos, visible para cualquier autenticado).
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";

export interface ConfigAuditLogRecord {
  id: number;
  settingKey: string;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
  changedAt: string | null;
}

export function useConfigAuditLogs(authToken: string, enabled: boolean) {
  const [logs, setLogs] = useState<ConfigAuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!authToken || !enabled) return;
    setIsLoading(true);
    try {
      // apiFetch desenvuelve `json.data` automáticamente (ver packages/shared/api.ts) —
      // el paginador de Laravel ya trae `{data: [...], current_page, ...}`, así
      // que aquí llega directamente el array de registros, no el wrapper.
      const data = await apiFetch<ConfigAuditLogRecord[]>("/config-audit-logs", { token: authToken });
      setLogs(data ?? []);
    } catch (err) {
      logError("useConfigAuditLogs.load", err);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    if (enabled && !hasLoaded) {
      load();
    }
  }, [enabled, hasLoaded, load]);

  // Inserta una entrada ya conocida (devuelta por PATCH /settings/{id}) sin
  // volver a consultar el endpoint — el cambio ocurre en la misma vista por
  // acción del propio usuario, no requiere polling para reflejarse.
  const prependLocal = useCallback((entry: ConfigAuditLogRecord) => {
    setLogs(prev => [entry, ...prev]);
  }, []);

  return { logs, isLoading, hasLoaded, reload: load, prependLocal };
}
