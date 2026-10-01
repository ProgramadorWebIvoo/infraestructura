/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cabecera del panel del DEBUG-MODE: título, indicadores de estado (pausa,
 * red simulada) y acciones globales (pausar, exportar, limpiar, expandir,
 * cerrar).
 */

import { Bug, Trash2, X, Pause, Play, Download, Maximize2, Minimize2, Gauge } from "lucide-react";
import IconActionButton from "@/components/UI/IconActionButton";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useDebugStore } from "@/stores/debugStore";
import { NETWORK_PROFILES } from "@/utils/debugNetworkProfile";

interface DebugPanelHeaderProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
  onExport: () => void;
  /** undefined = el tab actual no tiene entradas que limpiar. */
  onClearTab?: () => void;
}

export default function DebugPanelHeader({ expanded, onToggleExpanded, onClose, onExport, onClearTab }: DebugPanelHeaderProps) {
  const paused = useDebugStore(s => s.paused);
  const setPaused = useDebugStore(s => s.setPaused);
  const networkProfile = useDebugStore(s => s.networkProfile);
  const warning = SEMANTIC_COLOR_MAP.warning;

  return (
    <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Bug className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-black text-text-primary">DEBUG-MODE</span>
        {paused && (
          <span className={`rounded-pill px-2 py-0.5 text-[10px] font-black uppercase ${warning.bg100} ${warning.text700}`}>En pausa</span>
        )}
        {networkProfile !== "none" && (
          <span className={`flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-black uppercase ${warning.bg100} ${warning.text700}`}>
            <Gauge className="h-3 w-3" /> {NETWORK_PROFILES[networkProfile].label}
          </span>
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
          onClick={onExport}
        />
        {onClearTab && (
          <IconActionButton
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Limpiar tab actual"
            tooltip="Limpiar tab actual"
            onClick={onClearTab}
          />
        )}
        <IconActionButton
          icon={expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          label={expanded ? "Achicar panel" : "Expandir panel"}
          tooltip={expanded ? "Achicar panel" : "Expandir panel"}
          onClick={onToggleExpanded}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de debug"
          className="flex h-7 w-7 items-center justify-center rounded-control text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
