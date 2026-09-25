/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DEBUG-MODE — panel flotante de depuración: Network (requests HTTP
 * completos, con headers/body/cURL), Logs (logError/logWarn/logInfo),
 * WebSocket (eventos Pusher/Echo), Errors (excepciones no capturadas +
 * promesas rechazadas sin catch), Queries (inspector en vivo de TanStack
 * Query), Codebase (módulo/vista activa + hooks + God Nodes, ver
 * codebaseRouteMap.ts) y Acciones (atajos curados sin eval() libre, ver
 * DebugActionsPanel.tsx). Solo se monta (ver AppRoutes en App.tsx) cuando el
 * rol activo es ADMIN/SUPERADMIN y el flag fue activado desde CONFIG APP —
 * no depende de env vars ni de build flags, es 100% runtime y por-navegador.
 *
 * Atajo de teclado: Ctrl/Cmd+Shift+D alterna abierto/cerrado sin necesidad
 * de apuntar al botón flotante — útil mientras se reproduce un bug con las
 * manos ya en el teclado.
 *
 * ── Rendimiento: por qué está partido en Trigger + Content ──
 * <DebugPanelTrigger> (el botón flotante) es lo único montado mientras el
 * panel está cerrado, y solo se suscribe a `entries.length` (un número) —
 * ni filtra, ni busca, ni le importa el contenido de cada entrada. El
 * filtrado/búsqueda real (<DebugPanelContent>) ni siquiera se monta hasta
 * que se abre. Con polling activo cada 8-25s (notificaciones/proyectos/
 * catálogos, ver Rules/09-METRICS.md) más cada request HTTP normal de la
 * app, este componente puede recibir cientos de pushes por minuto — sin
 * esta separación, CADA push forzaría un re-render de un componente que
 * arma tabs, corre 3 filtros y hace un JSON.stringify por entrada, aunque
 * el panel nunca se haya abierto.
 */

import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Bug, Trash2, X, Pause, Play, Download, Maximize2, Minimize2 } from "lucide-react";
import Tabs, { type TabDefinition } from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import IconActionButton from "@/components/UI/IconActionButton";
import Select from "@/components/UI/Select";
import { SearchInput } from "@/components/UI/FilterBar";
import {
  useDebugStore,
  installGlobalErrorCapture,
  installPerfObservers,
  type DebugEntry,
  type DebugEntryKind,
  type DebugLevel,
} from "@/stores/debugStore";
import type { AuthUser } from "@/hooks/useAuth";
import DebugEntryList from "./DebugEntryList";
import DebugQueryPanel from "./DebugQueryPanel";
import DebugInfoPanel from "./DebugInfoPanel";
import DebugActionsPanel from "./DebugActionsPanel";
import DebugClosurePanel from "./DebugClosurePanel";
import DebugCodebasePanel from "./DebugCodebasePanel";
import DebugPerformancePanel from "./DebugPerformancePanel";
import { matchesSearch, downloadJson } from "./debugUtils";

type PanelTab = DebugEntryKind | "query" | "info" | "actions" | "closure" | "codebase" | "performance";

const TABS: { key: PanelTab; label: string }[] = [
  { key: "http", label: "Network" },
  { key: "log", label: "Logs" },
  { key: "websocket", label: "WebSocket" },
  { key: "error", label: "Errors" },
  { key: "query", label: "Queries" },
  { key: "performance", label: "Performance" },
  { key: "codebase", label: "Codebase" },
  { key: "actions", label: "Acciones" },
  { key: "closure", label: "Cierre F2" },
  { key: "info", label: "Info" },
];

const NON_ENTRY_TABS: PanelTab[] = ["query", "info", "actions", "closure", "codebase", "performance"];

const HTTP_METHOD_FILTERS = ["all", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const HTTP_STATUS_FILTERS = ["all", "2xx", "3xx", "4xx", "5xx"] as const;

const LEVEL_FILTERS: { key: DebugLevel | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "info", label: "Info" },
  { key: "warn", label: "Warn" },
  { key: "error", label: "Error" },
];

interface DebugPanelProps {
  authUser: AuthUser;
  activeRole?: string | null;
}

export default function DebugPanel({ authUser, activeRole }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  // Instalar la captura global de errores y el atajo de teclado no dependen
  // de si el panel está abierto — deben quedar armados apenas el rol/flag
  // habilitan DEBUG-MODE (ver docblock: ambos son baratos y globales al
  // componente, no a `open`).
  useEffect(() => {
    installGlobalErrorCapture();
    installPerfObservers();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) {
    return <DebugPanelTrigger onOpen={() => setOpen(true)} />;
  }

  return <DebugPanelContent authUser={authUser} activeRole={activeRole} onClose={() => setOpen(false)} />;
}

/** Solo se suscribe a la longitud del buffer — nunca al array completo ni a su contenido. */
function DebugPanelTrigger({ onOpen }: { onOpen: () => void }) {
  const entryCount = useDebugStore(s => s.entries.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Abrir DEBUG-MODE (Ctrl+Shift+D)"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-transform hover:scale-105 cursor-pointer"
    >
      <Bug className="h-5 w-5" />
      {entryCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-rose-500 px-1 text-[10px] font-black text-white">
          {entryCount > 99 ? "99+" : entryCount}
        </span>
      )}
    </button>
  );
}

interface DebugPanelContentProps {
  authUser: AuthUser;
  activeRole?: string | null;
  onClose: () => void;
}

function DebugPanelContent({ authUser, activeRole, onClose }: DebugPanelContentProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("http");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<DebugLevel | "all">("all");
  const [httpMethodFilter, setHttpMethodFilter] = useState<(typeof HTTP_METHOD_FILTERS)[number]>("all");
  const [httpStatusFilter, setHttpStatusFilter] = useState<(typeof HTTP_STATUS_FILTERS)[number]>("all");
  const [wsChannelFilter, setWsChannelFilter] = useState<string>("all");

  // useDeferredValue: con el panel abierto y tráfico real entrando, tipear
  // en el buscador no debería competir por el hilo principal con los
  // re-renders que cada nuevo evento capturado ya dispara.
  const deferredSearch = useDeferredValue(search);
  const searchLower = deferredSearch.trim().toLowerCase();

  const entries = useDebugStore(s => s.entries);
  const paused = useDebugStore(s => s.paused);
  const setPaused = useDebugStore(s => s.setPaused);
  const clear = useDebugStore(s => s.clear);

  const countsByKind = useMemo(() => {
    const counts: Record<DebugEntryKind, number> = { http: 0, log: 0, websocket: 0, error: 0 };
    for (const entry of entries) counts[entry.kind]++;
    return counts;
  }, [entries]);

  const tabDefinitions: TabDefinition[] = TABS.map(t => ({
    key: t.key,
    label: t.label,
    count: NON_ENTRY_TABS.includes(t.key) ? undefined : countsByKind[t.key as DebugEntryKind],
    showDot: t.key === "error" && countsByKind.error > 0,
  }));

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

  // Cap de renderizado (no de captura) — 500 filas DOM con contenido
  // expandible no es gratis, y casi nunca hace falta ver más de las últimas
  // 200 para depurar algo que acaba de pasar. El buffer completo sigue
  // intacto para "Exportar todo".
  const MAX_RENDERED_ROWS = 200;

  const { filteredEntries, hiddenCount } = useMemo(() => {
    if (!isEntryTab) return { filteredEntries: [] as DebugEntry[], hiddenCount: 0 };
    const matched = entriesForTab
      .filter(e => levelFilter === "all" || e.level === levelFilter)
      .filter(e => matchesSearch(e, searchLower))
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
  }, [entriesForTab, isEntryTab, activeTab, levelFilter, searchLower, httpMethodFilter, httpStatusFilter, wsChannelFilter]);

  return (
    <div
      className={`fixed z-50 flex flex-col overflow-hidden rounded-container border border-border-default bg-surface shadow-2xl transition-[width,height] duration-200 ${
        expanded
          ? "inset-3 sm:inset-6"
          : "bottom-3 right-3 h-[min(34rem,calc(100vh-1.5rem))] w-[min(28rem,calc(100vw-1.5rem))] sm:bottom-6 sm:right-6 sm:h-[min(34rem,calc(100vh-3rem))] sm:w-[min(28rem,calc(100vw-3rem))]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-black text-text-primary">DEBUG-MODE</span>
          {paused && (
            <span className="rounded-pill bg-warning-50 px-2 py-0.5 text-[10px] font-black uppercase text-warning-700">En pausa</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            label={paused ? "Reanudar captura" : "Pausar captura"}
            tooltip={paused ? "Reanudar captura" : "Pausar captura"}
            onClick={() => setPaused(!paused)}
          />
          <IconActionButton
            icon={<Download className="h-3.5 w-3.5" />}
            label="Exportar todo"
            tooltip="Exportar todo como JSON"
            onClick={() => downloadJson(`ivoo-debug-${Date.now()}.json`, entries)}
          />
          {isEntryTab && (
            <IconActionButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Limpiar tab actual"
              tooltip="Limpiar tab actual"
              onClick={() => clear(activeTab as DebugEntryKind)}
            />
          )}
          <IconActionButton
            icon={expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            label={expanded ? "Achicar panel" : "Expandir panel"}
            tooltip={expanded ? "Achicar panel" : "Expandir panel"}
            onClick={() => setExpanded(v => !v)}
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-control text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 px-3 pt-2">
        {expanded ? (
          <Tabs
            ariaLabel="Secciones de debug"
            activeKey={activeTab}
            onChange={key => setActiveTab(key as PanelTab)}
            fullWidth
            tabs={tabDefinitions}
          />
        ) : (
          // Con 9 tabs, <Tabs fullWidth> en el ancho colapsado (28rem) las
          // aprieta hasta volverlas ilegibles (sin ícono ni label completo).
          // Un <Select> muestra siempre la tab activa entera y el resto en
          // un listbox — mismo <activeTab>/<onChange>, solo cambia el control.
          <Select
            ariaLabel="Sección de debug activa"
            value={activeTab}
            onChange={key => setActiveTab(key as PanelTab)}
            options={tabDefinitions.map(t => ({
              value: t.key,
              label: t.count !== undefined && t.count > 0 ? `${t.label} (${t.count})` : t.label,
            }))}
            size="sm"
          />
        )}
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
              className="rounded-lg border border-border-default bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
            >
              {HTTP_METHOD_FILTERS.map(m => (
                <option key={m} value={m}>{m === "all" ? "Todos los métodos" : m}</option>
              ))}
            </select>
            <select
              value={httpStatusFilter}
              onChange={e => setHttpStatusFilter(e.target.value as (typeof HTTP_STATUS_FILTERS)[number])}
              aria-label="Filtrar por status HTTP"
              className="rounded-lg border border-border-default bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
            >
              {HTTP_STATUS_FILTERS.map(s => (
                <option key={s} value={s}>{s === "all" ? "Todos los status" : s}</option>
              ))}
            </select>
          </div>
        )}
        {activeTab === "websocket" && wsChannels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={wsChannelFilter}
              onChange={e => setWsChannelFilter(e.target.value)}
              aria-label="Filtrar por canal WebSocket"
              className="rounded-lg border border-border-default bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
            >
              <option value="all">Todos los canales</option>
              {wsChannels.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <TabPanel activeKey={activeTab}>
          {activeTab === "query" ? (
            <DebugQueryPanel search={deferredSearch} />
          ) : activeTab === "performance" ? (
            <DebugPerformancePanel />
          ) : activeTab === "codebase" ? (
            <DebugCodebasePanel />
          ) : activeTab === "actions" ? (
            <DebugActionsPanel />
          ) : activeTab === "closure" ? (
            <DebugClosurePanel />
          ) : activeTab === "info" ? (
            <DebugInfoPanel authUser={authUser} activeRole={activeRole} />
          ) : (
            <div className="space-y-2">
              {hiddenCount > 0 && (
                <p className="text-[10px] font-bold text-text-tertiary">
                  Mostrando las últimas {MAX_RENDERED_ROWS} — {hiddenCount} más ocultas (afiná la búsqueda o exportá todo).
                </p>
              )}
              <DebugEntryList
                entries={filteredEntries}
                showCurl={activeTab === "http"}
                emptyMessage={
                  entriesForTab.length === 0
                    ? "Sin eventos todavía. Las acciones de la app aparecerán acá en tiempo real."
                    : "Nada coincide con el filtro/búsqueda actual."
                }
              />
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  );
}
