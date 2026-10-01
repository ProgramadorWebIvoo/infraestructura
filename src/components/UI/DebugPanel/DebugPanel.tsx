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
 * La captura global (errores, Web Vitals) NO se instala acá sino en
 * hooks/useDebugRuntime.ts (desde App): sigue viva con el panel cerrado y se
 * remueve por completo al apagar el modo.
 *
 * Atajo de teclado: Ctrl/Cmd+Shift+D alterna abierto/cerrado sin necesidad
 * de apuntar al botón flotante — útil mientras se reproduce un bug con las
 * manos ya en el teclado.
 *
 * ── Rendimiento: por qué está partido en Trigger + Content ──
 * <DebugPanelTrigger> (el botón flotante, ver DebugPanelTrigger.tsx) es lo único montado mientras el
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

import { useEffect, useState } from "react";
import Tabs, { type TabDefinition } from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import Select from "@/components/UI/Select";
import { useDebugStore, type DebugEntryKind } from "@/stores/debugStore";
import { MAX_DEBUG_ENTRIES } from "@/stores/debugRingBuffer";
import { useDebugEntryFilters } from "@/hooks/useDebugEntryFilters";
import { DEBUG_PANEL_TABS, MAX_RENDERED_ROWS, NON_ENTRY_TABS, type DebugPanelTab } from "@/constants/debugPanel";
import type { AuthUser } from "@/hooks/useAuth";
import DebugPanelTrigger from "./DebugPanelTrigger";
import DebugPanelHeader from "./DebugPanelHeader";
import DebugEntryFilterBar from "./DebugEntryFilterBar";
import DebugEntryList from "./DebugEntryList";
import DebugQueryPanel from "./DebugQueryPanel";
import DebugInfoPanel from "./DebugInfoPanel";
import DebugActionsPanel from "./DebugActionsPanel";
import DebugCodebasePanel from "./DebugCodebasePanel";
import DebugStoragePanel from "./DebugStoragePanel";
import DebugPerformancePanel from "./DebugPerformancePanel";
import { useCopyDiagnostic } from "@/hooks/useCopyDiagnostic";
import { useDebugSessionIO } from "@/hooks/useDebugSessionIO";
import { useDebugReviewStore } from "@/stores/debugReviewStore";
import DebugReviewBanner from "./DebugReviewBanner";

interface DebugPanelProps {
  authUser: AuthUser;
  activeRole?: string | null;
}

export default function DebugPanel({ authUser, activeRole }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

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

interface DebugPanelContentProps {
  authUser: AuthUser;
  activeRole?: string | null;
  onClose: () => void;
}

function DebugPanelContent({ authUser, activeRole, onClose }: DebugPanelContentProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DebugPanelTab>("http");
  const filters = useDebugEntryFilters(activeTab);
  const { entries, isReviewing, countsByKind, isEntryTab, filteredEntries, hiddenCount, entriesForTabCount, deferredSearch } = filters;
  const clear = useDebugStore(s => s.clear);
  const dropped = useDebugStore(s => s.dropped);
  const copyDiagnostic = useCopyDiagnostic(activeRole);
  const { exportSession, importSession } = useDebugSessionIO(entries);
  const closeReview = useDebugReviewStore(s => s.close);

  // La sesión importada solo vive mientras el panel está abierto.
  useEffect(() => closeReview, [closeReview]);

  const tabDefinitions: TabDefinition[] = DEBUG_PANEL_TABS.map(t => ({
    key: t.key,
    label: t.label,
    count: NON_ENTRY_TABS.includes(t.key) ? undefined : countsByKind[t.key as DebugEntryKind],
    showDot: t.key === "error" && countsByKind.error > 0,
  }));

  return (
    <div
      className={`fixed z-50 flex flex-col overflow-hidden rounded-container border border-border-default bg-surface shadow-2xl transition-[width,height] duration-200 ${
        expanded
          ? "inset-3 sm:inset-6"
          : "bottom-3 right-3 h-[min(34rem,calc(100vh-1.5rem))] w-[min(28rem,calc(100vw-1.5rem))] sm:bottom-6 sm:right-6 sm:h-[min(34rem,calc(100vh-3rem))] sm:w-[min(28rem,calc(100vw-3rem))]"
      }`}
    >
      <DebugPanelHeader
        expanded={expanded}
        onToggleExpanded={() => setExpanded(v => !v)}
        onClose={onClose}
        onExport={exportSession}
        onImport={file => void importSession(file)}
        onCopyDiagnostic={copyDiagnostic}
        onClearTab={isEntryTab && !isReviewing ? () => clear(activeTab as DebugEntryKind) : undefined}
      />

      <DebugReviewBanner />

      <div className="space-y-2 px-3 pt-2">
        {expanded ? (
          <Tabs
            ariaLabel="Secciones de debug"
            activeKey={activeTab}
            onChange={key => setActiveTab(key as DebugPanelTab)}
            fullWidth
            tabs={tabDefinitions}
          />
        ) : (
          // Con 10 tabs, <Tabs fullWidth> en el ancho colapsado (28rem) las
          // aprieta hasta volverlas ilegibles (sin ícono ni label completo).
          // Un <Select> muestra siempre la tab activa entera y el resto en
          // un listbox — mismo <activeTab>/<onChange>, solo cambia el control.
          <Select
            ariaLabel="Sección de debug activa"
            value={activeTab}
            onChange={key => setActiveTab(key as DebugPanelTab)}
            options={tabDefinitions.map(t => ({
              value: t.key,
              label: t.count !== undefined && t.count > 0 ? `${t.label} (${t.count})` : t.label,
            }))}
            size="sm"
          />
        )}
        <DebugEntryFilterBar activeTab={activeTab} filters={filters} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <TabPanel activeKey={activeTab}>
          {activeTab === "query" ? (
            <DebugQueryPanel search={deferredSearch} />
          ) : activeTab === "performance" ? (
            <DebugPerformancePanel />
          ) : activeTab === "storage" ? (
            <DebugStoragePanel search={deferredSearch} />
          ) : activeTab === "codebase" ? (
            <DebugCodebasePanel />
          ) : activeTab === "actions" ? (
            <DebugActionsPanel />
          ) : activeTab === "info" ? (
            <DebugInfoPanel authUser={authUser} activeRole={activeRole} />
          ) : (
            <div className="space-y-2">
              {dropped > 0 && !isReviewing && (
                <p className="text-[10px] font-bold text-text-tertiary">
                  Buffer circular ({MAX_DEBUG_ENTRIES} máx.) — {dropped} eventos antiguos descartados.
                </p>
              )}
              {hiddenCount > 0 && (
                <p className="text-[10px] font-bold text-text-tertiary">
                  Mostrando las últimas {MAX_RENDERED_ROWS} — {hiddenCount} más ocultas (afiná la búsqueda o exportá todo).
                </p>
              )}
              <DebugEntryList
                entries={filteredEntries}
                showCurl={activeTab === "http"}
                emptyMessage={
                  entriesForTabCount === 0
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
