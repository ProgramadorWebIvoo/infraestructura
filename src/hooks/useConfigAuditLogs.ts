/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Historial de cambios de CONFIG APP — exclusivo de SUPERADMIN. Separado de
 * useAuditLogs (auditoría de proyectos, visible para cualquier autenticado).
 *
 * Paginado server-side (no scroll infinito ni "cargar más"): el volumen de
 * cambios de configuración crece indefinidamente con el tiempo, así que traer
 * todo de una sola vez no escala. `page` dispara una nueva consulta; la
 * entrada insertada localmente tras un guardado (`prependLocal`) solo aplica
 * mientras se está en la página 1 (donde aparecería de todas formas al
 * recargar).
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

interface ConfigAuditLogPage {
  items: ConfigAuditLogRecord[];
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
}

const PER_PAGE = 20;

export function useConfigAuditLogs(authToken: string, enabled: boolean) {
  const [logs, setLogs] = useState<ConfigAuditLogRecord[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(
    async (targetPage: number) => {
      if (!authToken || !enabled) return;
      setIsLoading(true);
      try {
        const data = await apiFetch<ConfigAuditLogPage>(`/config-audit-logs?page=${targetPage}&per_page=${PER_PAGE}`, {
          token: authToken,
        });
        setLogs(data.items ?? []);
        setPage(data.currentPage ?? targetPage);
        setLastPage(data.lastPage ?? 1);
        setTotal(data.total ?? 0);
      } catch (err) {
        logError("useConfigAuditLogs.load", err);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    },
    [authToken, enabled],
  );

  useEffect(() => {
    if (enabled && !hasLoaded) {
      load(1);
    }
  }, [enabled, hasLoaded, load]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > lastPage || targetPage === page) return;
      load(targetPage);
    },
    [load, lastPage, page],
  );

  // Inserta una entrada ya conocida (devuelta por PATCH /settings/{id}) sin
  // volver a consultar el endpoint — el cambio ocurre en la misma vista por
  // acción del propio usuario, no requiere polling para reflejarse. Solo
  // aplica en la página 1: en otras páginas no correspondería mostrarla.
  const prependLocal = useCallback(
    (entry: ConfigAuditLogRecord) => {
      if (page !== 1) return;
      setLogs(prev => [entry, ...prev].slice(0, PER_PAGE));
      setTotal(prev => prev + 1);
    },
    [page],
  );

  return { logs, isLoading, hasLoaded, page, lastPage, total, goToPage, prependLocal };
}
