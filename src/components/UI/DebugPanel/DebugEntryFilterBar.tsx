/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Buscador y filtros del panel del DEBUG-MODE: texto, nivel, método/status
 * HTTP (tab Network), canal (tab WebSocket) y red simulada (tab Network).
 */

import { SearchInput } from "@/components/UI/FilterBar";
import { HTTP_METHOD_FILTERS, HTTP_STATUS_FILTERS, LEVEL_FILTERS, type DebugPanelTab } from "@/constants/debugPanel";
import type { DebugEntryFilters } from "@/hooks/useDebugEntryFilters";
import DebugNetworkProfileSelect from "./DebugNetworkProfileSelect";

const SELECT_CLASS = "rounded-lg border border-border-default bg-white px-2 py-1 text-[10px] font-bold text-slate-600";

interface DebugEntryFilterBarProps {
  activeTab: DebugPanelTab;
  filters: DebugEntryFilters;
}

export default function DebugEntryFilterBar({ activeTab, filters }: DebugEntryFilterBarProps) {
  const {
    search, setSearch, isEntryTab, levelFilter, setLevelFilter,
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
      {activeTab === "http" && (
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
      {activeTab === "websocket" && wsChannels.length > 0 && (
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
