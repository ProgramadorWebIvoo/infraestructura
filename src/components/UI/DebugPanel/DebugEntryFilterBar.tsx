/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Buscador (texto o regex) y filtros del panel del DEBUG-MODE: nivel,
 * categoría, método/status
 * HTTP (tab Network), canal (tab WebSocket) y red simulada (tab Network).
 */

import { SearchInput } from "@/components/UI/FilterBar";
import { CATEGORY_FILTERS, HTTP_METHOD_FILTERS, HTTP_STATUS_FILTERS, LEVEL_FILTERS, type DebugPanelTab } from "@/constants/debugPanel";
import type { DebugCategory } from "@/stores/debugStore";
import type { DebugEntryFilters } from "@/hooks/useDebugEntryFilters";
import DebugNetworkProfileSelect from "./DebugNetworkProfileSelect";

const SELECT_CLASS = "rounded-lg border border-border-default bg-white px-2 py-1 text-[10px] font-bold text-slate-600";

interface DebugEntryFilterBarProps {
  activeTab: DebugPanelTab;
  filters: DebugEntryFilters;
  /** Modo compacto: solo búsqueda; oculta nivel, categoría y filtros por tab. */
  compact?: boolean;
}

export default function DebugEntryFilterBar({ activeTab, filters, compact = false }: DebugEntryFilterBarProps) {
  const {
    search, setSearch, isEntryTab, levelFilter, setLevelFilter, regexMode, setRegexMode, searchError,
    categoryFilter, setCategoryFilter,
    httpMethodFilter, setHttpMethodFilter, httpStatusFilter, setHttpStatusFilter,
    wsChannelFilter, setWsChannelFilter, wsChannels,
  } = filters;

  return (
    <>
      <div className="flex items-center gap-2">
        <SearchInput
          id="debug-panel-search"
          value={search}
          onChange={setSearch}
          placeholder="Buscar por texto, URL, key..."
          ariaLabel="Buscar en el panel de debug"
        />
        {isEntryTab && (
          <button
            type="button"
            onClick={() => setRegexMode(!regexMode)}
            aria-pressed={regexMode}
            aria-label="Buscar con expresión regular"
            title="Expresión regular (busca en la etiqueta y el inicio del detalle)"
            className={`shrink-0 rounded-lg border px-2 py-1.5 font-mono text-[11px] font-black cursor-pointer ${
              regexMode ? "border-brand-300 bg-brand-50 text-brand-700" : "border-border-default bg-white text-slate-500 hover:text-slate-700"
            }`}
          >
            .*
          </button>
        )}
        {isEntryTab && !compact && (
          <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100/60 p-1">
            {LEVEL_FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setLevelFilter(f.key)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                  levelFilter === f.key ? "bg-white text-slate-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {isEntryTab && searchError && <p className="text-[10px] font-bold text-danger-600">{searchError}</p>}
      {isEntryTab && !compact && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as DebugCategory | "all")}
            aria-label="Filtrar por categoría"
            className={SELECT_CLASS}
          >
            {CATEGORY_FILTERS.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
      )}
      {activeTab === "http" && !compact && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={httpMethodFilter}
            onChange={e => setHttpMethodFilter(e.target.value as (typeof HTTP_METHOD_FILTERS)[number])}
            aria-label="Filtrar por método HTTP"
            className={SELECT_CLASS}
          >
            {HTTP_METHOD_FILTERS.map(m => (
              <option key={m} value={m}>{m === "all" ? "Todos los métodos" : m}</option>
            ))}
          </select>
          <select
            value={httpStatusFilter}
            onChange={e => setHttpStatusFilter(e.target.value as (typeof HTTP_STATUS_FILTERS)[number])}
            aria-label="Filtrar por status HTTP"
            className={SELECT_CLASS}
          >
            {HTTP_STATUS_FILTERS.map(s => (
              <option key={s} value={s}>{s === "all" ? "Todos los status" : s}</option>
            ))}
          </select>
          <DebugNetworkProfileSelect />
        </div>
      )}
      {activeTab === "websocket" && !compact && wsChannels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={wsChannelFilter}
            onChange={e => setWsChannelFilter(e.target.value)}
            aria-label="Filtrar por canal WebSocket"
            className={SELECT_CLASS}
          >
            <option value="all">Todos los canales</option>
            {wsChannels.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
