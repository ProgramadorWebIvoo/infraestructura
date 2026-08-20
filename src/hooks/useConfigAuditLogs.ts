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
 *
 * Filtros server-side: antes solo `page`/`per_page` — el buscador del panel
 * filtraba client-side sobre la página cargada, así que un registro fuera de
 * las últimas 20 entradas era invisible a la búsqueda. Ahora `q`/`entityType`/
 * `action`/`user`/`dateFrom`/`dateTo` viajan al backend, que sí puede
 * encontrar cualquier registro de toda la tabla. Cambiar cualquier filtro
 * resetea a la página 1 (un resultado de otra página ya no aplica al filtro
 * nuevo).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import { logError } from "../services/logger";
import { useDebounce } from "./useDebounce";

export interface ConfigAuditLogRecord {
  id: number;
  entityType: string;
  action: string;
  settingKey: string | null;
  oldValue: string | null;
  newValue: string | null;
  /** ID inmutable del usuario que hizo el cambio (null si el actor no quedó registrado). A diferencia de `userName`, no cambia si el usuario se renombra. */
  userId: number | string | null;
  /** Nombre del usuario tal como era al momento del cambio (snapshot histórico) — puede no coincidir con el nombre actual si luego se renombró. */
  userName: string | null;
  /** Email actual del usuario (resuelto vía `userId`, no snapshot) — null si el usuario fue eliminado después. */
  userEmail: string | null;
  changedAt: string | null;
}

export interface ConfigAuditLogFilters {
  q: string;
  entityType: string;
  action: string;
  user: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_AUDIT_FILTERS: ConfigAuditLogFilters = {
  q: "",
  entityType: "",
  action: "",
  user: "",
  dateFrom: "",
  dateTo: "",
};

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
  const [filters, setFilters] = useState<ConfigAuditLogFilters>(EMPTY_AUDIT_FILTERS);

  const debouncedQuery = useDebounce(filters.q, 350);
  const debouncedUser = useDebounce(filters.user, 350);

  // Filtros efectivamente enviados al backend — texto libre debounced (evita
  // un fetch por tecla), el resto (selects/fechas) aplica de inmediato.
  const effectiveFilters = useMemo(
    () => ({ ...filters, q: debouncedQuery, user: debouncedUser }),
    [filters, debouncedQuery, debouncedUser],
  );

  const activeFilterCount = useMemo(
    () => Object.values(effectiveFilters).filter((v) => v.trim() !== "").length,
    [effectiveFilters],
  );

  const load = useCallback(
    async (targetPage: number) => {
      if (!authToken || !enabled) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), per_page: String(PER_PAGE) });
        if (effectiveFilters.q.trim()) params.set("q", effectiveFilters.q.trim());
        if (effectiveFilters.entityType) params.set("entity_type", effectiveFilters.entityType);
        if (effectiveFilters.action) params.set("action", effectiveFilters.action);
        if (effectiveFilters.user.trim()) params.set("user", effectiveFilters.user.trim());
        if (effectiveFilters.dateFrom) params.set("date_from", effectiveFilters.dateFrom);
        if (effectiveFilters.dateTo) params.set("date_to", effectiveFilters.dateTo);

        const data = await apiFetch<ConfigAuditLogPage>(`/config-audit-logs?${params.toString()}`, {
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
    [authToken, enabled, effectiveFilters],
  );

  // Carga inicial y recarga ante cualquier cambio de filtro efectivo —
  // siempre vuelve a página 1 (un resultado de la página anterior puede ya
  // no pertenecer al conjunto filtrado nuevo).
  useEffect(() => {
    if (!enabled) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, effectiveFilters]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > lastPage || targetPage === page) return;
      load(targetPage);
    },
    [load, lastPage, page],
  );

  const updateFilter = useCallback(<K extends keyof ConfigAuditLogFilters>(key: K, value: ConfigAuditLogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_AUDIT_FILTERS), []);

  // Inserta una entrada ya conocida (devuelta por PATCH /settings/{id}) sin
  // volver a consultar el endpoint — el cambio ocurre en la misma vista por
  // acción del propio usuario, no requiere polling para reflejarse. Solo
  // aplica en la página 1 sin filtros activos: con filtros activos no hay
  // garantía de que la entrada nueva cumpla el criterio, y con paginación en
  // otra página no correspondería mostrarla.
  const prependLocal = useCallback(
    (entry: ConfigAuditLogRecord) => {
      if (page !== 1 || activeFilterCount > 0) return;
      setLogs(prev => [entry, ...prev].slice(0, PER_PAGE));
      setTotal(prev => prev + 1);
    },
    [page, activeFilterCount],
  );

  return {
    logs, isLoading, hasLoaded, page, lastPage, total, goToPage, prependLocal,
    filters, updateFilter, clearFilters, activeFilterCount,
  };
}
