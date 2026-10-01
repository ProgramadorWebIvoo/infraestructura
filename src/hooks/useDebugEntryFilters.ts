/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado de filtros y lista filtrada del panel del DEBUG-MODE (sin JSX).
 * Separado de DebugPanel.tsx para respetar SRP y el tope de ~300 líneas.
 */

import { useDeferredValue, useMemo, useState } from "react";
import { useDebugStore, type DebugCategory, type DebugEntry, type DebugEntryKind, type DebugLevel } from "@/stores/debugStore";
import { buildSearchMatcher } from "@/utils/debugSearch";
import {
  HTTP_METHOD_FILTERS,
  HTTP_STATUS_FILTERS,
  MAX_RENDERED_ROWS,
  NON_ENTRY_TABS,
  type DebugPanelTab,
} from "@/constants/debugPanel";

export function useDebugEntryFilters(activeTab: DebugPanelTab) {
  const [search, setSearch] = useState("");
  const [regexMode, setRegexMode] = useState(false);
  const [levelFilter, setLevelFilter] = useState<DebugLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<DebugCategory | "all">("all");
  const [httpMethodFilter, setHttpMethodFilter] = useState<(typeof HTTP_METHOD_FILTERS)[number]>("all");
  const [httpStatusFilter, setHttpStatusFilter] = useState<(typeof HTTP_STATUS_FILTERS)[number]>("all");
  const [wsChannelFilter, setWsChannelFilter] = useState<string>("all");

  // useDeferredValue: con el panel abierto y tráfico real entrando, tipear
  // en el buscador no debería competir por el hilo principal con los
  // re-renders que cada nuevo evento capturado ya dispara.
  const deferredSearch = useDeferredValue(search);
  const matcher = useMemo(() => buildSearchMatcher(deferredSearch, regexMode), [deferredSearch, regexMode]);

  const entries = useDebugStore(s => s.entries);

  const countsByKind = useMemo(() => {
    const counts: Record<DebugEntryKind, number> = { http: 0, log: 0, websocket: 0, error: 0 };
    for (const entry of entries) counts[entry.kind]++;
    return counts;
  }, [entries]);

  const isEntryTab = !NON_ENTRY_TABS.includes(activeTab);

  const entriesForTab = useMemo(
    () => (isEntryTab ? entries.filter((e: DebugEntry) => e.kind === activeTab) : []),
    [entries, activeTab, isEntryTab],
  );

  // Canales distintos vistos hasta ahora — populan el <select> del tab
  // WebSocket sin mantener una lista hardcodeada de canales posibles.
  const wsChannels = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.kind !== "websocket") continue;
      const channel = (e.detail as Record<string, unknown> | undefined)?.channel;
      if (typeof channel === "string") set.add(channel);
    }
    return Array.from(set).sort();
  }, [entries]);

  const { filteredEntries, hiddenCount } = useMemo(() => {
    if (!isEntryTab) return { filteredEntries: [] as DebugEntry[], hiddenCount: 0 };
    const matched = entriesForTab
      .filter(e => levelFilter === "all" || e.level === levelFilter)
      .filter(e => categoryFilter === "all" || e.category === categoryFilter)
      .filter(matcher.matches)
      .filter(e => {
        if (activeTab !== "http") return true;
        const detail = e.detail as Record<string, unknown> | undefined;
        if (httpMethodFilter !== "all" && detail?.method !== httpMethodFilter) return false;
        if (httpStatusFilter !== "all") {
          const status = Number(detail?.status);
          if (!Number.isFinite(status) || `${Math.floor(status / 100)}xx` !== httpStatusFilter) return false;
        }
        return true;
      })
      .filter(e => {
        if (activeTab !== "websocket" || wsChannelFilter === "all") return true;
        return (e.detail as Record<string, unknown> | undefined)?.channel === wsChannelFilter;
      })
      .slice()
      .reverse();
    return {
      filteredEntries: matched.slice(0, MAX_RENDERED_ROWS),
      hiddenCount: Math.max(0, matched.length - MAX_RENDERED_ROWS),
    };
  }, [entriesForTab, isEntryTab, activeTab, levelFilter, categoryFilter, matcher, httpMethodFilter, httpStatusFilter, wsChannelFilter]);

  return {
    entries,
    countsByKind,
    isEntryTab,
    entriesForTabCount: entriesForTab.length,
    wsChannels,
    filteredEntries,
    hiddenCount,
    search,
    setSearch,
    deferredSearch,
    searchError: matcher.error,
    regexMode,
    setRegexMode,
    levelFilter,
    setLevelFilter,
    categoryFilter,
    setCategoryFilter,
    httpMethodFilter,
    setHttpMethodFilter,
    httpStatusFilter,
    setHttpStatusFilter,
    wsChannelFilter,
    setWsChannelFilter,
  };
}

export type DebugEntryFilters = ReturnType<typeof useDebugEntryFilters>;
