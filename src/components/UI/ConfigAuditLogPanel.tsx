/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Especialización de AuditLogPanel para ConfigAuditLogRecord: resuelve el
 * título de cada entrada y arma su render sin que cada vista consumidora
 * (ConfigAppPanel, AIConfigPanel, Proveedores, Materiales, Usuarios) tenga
 * que reimplementar entryTitle()/renderEntry() por su cuenta — antes cada
 * vista duplicaba esa lógica de presentación, cuando el único dato externo
 * que realmente varía es `settingLabelByKey` (solo aplica a entidades
 * entityType: "setting"; el resto de vistas simplemente no lo pasan).
 *
 * Filtros avanzados (tipo de entidad, acción, usuario, rango de fechas):
 * antes la búsqueda era client-side sobre solo la página cargada (20
 * registros), así que un cambio de hace una semana era invisible salvo que
 * estuviera en esa página. Ahora todos los filtros viajan al backend
 * (`useConfigAuditLogs`), así que "auditar" realmente encuentra cualquier
 * registro de toda la tabla, no solo los últimos 20.
 */

import { useMemo } from "react";
import { X } from "lucide-react";
import AuditLogPanel from "./AuditLogPanel";
import AuditLogValueDiff from "./AuditLogValueDiff";
import Select from "./Select";
import type { ConfigAuditLogFilters, ConfigAuditLogRecord } from "../../hooks/useConfigAuditLogs";

interface ConfigAuditLogPanelProps {
  title?: string;
  logs: ConfigAuditLogRecord[];
  isLoading: boolean;
  /** Label legible por key de setting — solo relevante para entradas entityType: "setting" (CONFIG APP). Se omite en vistas sin settings propios (ej. config de IA). */
  settingLabelByKey?: Record<string, string>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pagination?: {
    page: number;
    lastPage: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  /** Filtros server-side (búsqueda, tipo de entidad, acción, usuario, rango de fechas). Si se omite, el panel cae al filtrado client-side heredado (compatibilidad hacia atrás). */
  filters?: ConfigAuditLogFilters;
  onFilterChange?: <K extends keyof ConfigAuditLogFilters>(key: K, value: ConfigAuditLogFilters[K]) => void;
  onClearFilters?: () => void;
  activeFilterCount?: number;
}

/**
 * Catálogo fijo de tipos de entidad auditados en todo el sistema (backend:
 * `ConfigAuditLog::recordAdminAction`/`recordSettingChange`) — labels
 * legibles para el selector de filtro. No se deriva dinámicamente de los
 * `logs` cargados porque el usuario debe poder filtrar por un tipo que no
 * aparece en la página actual (ej. "Usuarios" mientras ve solo cambios de
 * "Materiales" recientes) — ese es justamente el problema que resuelve tener
 * filtros server-side en vez de client-side.
 */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  setting: "Configuración",
  user: "Usuarios",
  contractor: "Proveedores",
  material: "Materiales",
  ai_config: "Modelos de IA",
  currency: "Monedas",
  notification_rule: "Notificaciones",
};

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  ...Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

/**
 * Título de una entrada: para cambios de CONFIG APP (`entityType: "setting"`)
 * usa el label legible del catálogo si está disponible; para el resto de
 * acciones administrativas (usuarios, proveedores, materiales, IA, monedas,
 * matriz de notificaciones) `settingKey` viene null — el texto legible ahí
 * es `action` (ej. "Modificación de moneda"), no la key.
 */
function entryTitle(log: ConfigAuditLogRecord, settingLabelByKey: Record<string, string>): string {
  return log.entityType === "setting"
    ? (settingLabelByKey[log.settingKey ?? ""] ?? log.settingKey ?? log.action)
    : log.action;
}

export default function ConfigAuditLogPanel({
  title = "Historial de cambios",
  logs,
  isLoading,
  settingLabelByKey = {},
  searchPlaceholder = "Buscar por parámetro, usuario o valor...",
  emptyMessage = "Todavía no se ha modificado ningún parámetro.",
  pagination,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount = 0,
}: ConfigAuditLogPanelProps) {
  const hasServerFilters = filters !== undefined && onFilterChange !== undefined;

  // Catálogo de acciones para el select — derivado de las entradas ya
  // vistas en esta sesión (no hay endpoint de catálogo separado). No es
  // exhaustivo de toda la tabla, pero cubre lo que el usuario ya vio y crece
  // orgánicamente mientras navega; el filtro de texto libre sigue cubriendo
  // cualquier acción que aún no haya aparecido en pantalla.
  const actionOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts = [{ value: "", label: "Todas las acciones" }];
    for (const log of logs) {
      if (log.action && !seen.has(log.action)) {
        seen.add(log.action);
        opts.push({ value: log.action, label: log.action });
      }
    }
    return opts;
  }, [logs]);

  const filtersSlot = hasServerFilters ? (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filters.entityType}
          onChange={(v) => onFilterChange("entityType", v)}
          options={ENTITY_TYPE_OPTIONS}
          size="sm"
          ariaLabel="Filtrar por tipo"
          accent="brand"
        />
        <Select
          value={filters.action}
          onChange={(v) => onFilterChange("action", v)}
          options={actionOptions}
          size="sm"
          ariaLabel="Filtrar por acción"
          accent="brand"
        />
      </div>
      <input
        type="text"
        value={filters.user}
        onChange={(e) => onFilterChange("user", e.target.value)}
        placeholder="Filtrar por usuario..."
        aria-label="Filtrar por usuario"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Desde</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
            max={filters.dateTo || undefined}
            aria-label="Fecha desde"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Hasta</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange("dateTo", e.target.value)}
            min={filters.dateFrom || undefined}
            aria-label="Fecha hasta"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
          />
        </label>
      </div>
      {activeFilterCount > 0 && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
          Limpiar filtros
        </button>
      )}
    </>
  ) : undefined;

  return (
    <AuditLogPanel<ConfigAuditLogRecord>
      title={title}
      entries={logs}
      isLoading={isLoading}
      defaultOpen
      sticky
      fillViewport
      stickyOffset="1.5rem"
      pagination={pagination}
      searchableText={log => {
        const t = entryTitle(log, settingLabelByKey);
        return `${t} ${log.userName ?? ""} ${log.userEmail ?? ""} ${log.oldValue ?? ""} ${log.newValue ?? ""}`;
      }}
      keyOf={log => log.id}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      searchValue={hasServerFilters ? filters.q : undefined}
      onSearchChange={hasServerFilters ? (v) => onFilterChange("q", v) : undefined}
      filtersSlot={filtersSlot}
      activeFilterCount={activeFilterCount}
      renderEntry={log => (
        <div className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-3">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-text-secondary leading-snug wrap-break-word">
              {entryTitle(log, settingLabelByKey)}
            </span>
            {log.entityType !== "setting" && (
              <span className="shrink-0 rounded-pill bg-surface px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted border border-border-subtle">
                {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
              </span>
            )}
          </div>
          <span className="block text-[10px] font-mono text-text-muted mt-0.5">{log.changedAt}</span>
          <AuditLogValueDiff oldValue={log.oldValue} newValue={log.newValue} />
          {log.userName && (
            <p className="text-[10px] text-text-muted font-medium mt-1">
              por {log.userName}
              {log.userEmail && <span className="font-mono text-text-muted/80"> ({log.userEmail})</span>}
            </p>
          )}
        </div>
      )}
    />
  );
}
