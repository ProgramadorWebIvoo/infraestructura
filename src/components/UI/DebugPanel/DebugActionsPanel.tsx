/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Acciones" del DEBUG-MODE: atajos curados para depuración —
 * deliberadamente SIN eval()/Function() de código libre. Cada acción es una
 * función fija y auditable, no una consola de código arbitrario: mismo
 * espíritu que el resto del panel (100% client-side, gateado a
 * ADMIN/SUPERADMIN), pero sin la superficie de riesgo de ejecutar JS
 * tipeado en runtime.
 */

import { useState } from "react";
import { RotateCcw, RefreshCw, HardDriveDownload, Bug, WifiOff, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { pushDebugEntry } from "@/stores/debugStore";
import { useToast } from "@/components/UI/Toast";
import { downloadJson } from "./debugUtils";

interface DebugAction {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  danger?: boolean;
  run: (ctx: RunContext) => void;
}

interface RunContext {
  queryClient: ReturnType<typeof useQueryClient>;
  showToast: (message: string, variant?: "success" | "info" | "warning" | "error") => void;
}

function readLocalStorageSnapshot(): Record<string, { chars: number; preview: string }> {
  const snapshot: Record<string, { chars: number; preview: string }> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const value = window.localStorage.getItem(key) ?? "";
    snapshot[key] = { chars: value.length, preview: value.slice(0, 200) };
  }
  return snapshot;
}

const ACTIONS: DebugAction[] = [
  {
    key: "refetch-active",
    label: "Refrescar queries activas",
    description: "Fuerza refetch de todas las queries de TanStack montadas en pantalla ahora mismo.",
    icon: <RefreshCw className="h-4 w-4" />,
    run: ({ queryClient, showToast }) => {
      queryClient.invalidateQueries();
      showToast("Refetch disparado para todas las queries activas.", "info");
    },
  },
  {
    key: "clear-query-cache",
    label: "Limpiar cache de TanStack Query",
    description: "Vacía el cache en memoria y el persistido en localStorage (clave ivoo-query-cache). Próxima navegación hidrata desde cero.",
    icon: <Trash2 className="h-4 w-4" />,
    danger: true,
    run: ({ queryClient, showToast }) => {
      queryClient.clear();
      showToast("Cache de TanStack Query limpiado.", "warning");
    },
  },
  {
    key: "export-localstorage",
    label: "Exportar snapshot de localStorage",
    description: "Descarga un JSON con todas las claves de localStorage de este origen y su tamaño (valores truncados a 200 chars).",
    icon: <HardDriveDownload className="h-4 w-4" />,
    run: ({ showToast }) => {
      downloadJson(`ivoo-localstorage-${Date.now()}.json`, readLocalStorageSnapshot());
      showToast("Snapshot de localStorage descargado.", "success");
    },
  },
  {
    key: "simulate-error",
    label: "Simular error no capturado",
    description: "Empuja una entrada sintética al tab Errors — útil para verificar que el ErrorBoundary/toast de error reacciona sin esperar un bug real.",
    icon: <Bug className="h-4 w-4" />,
    run: ({ showToast }) => {
      pushDebugEntry({
        kind: "error",
        level: "error",
        label: "Error simulado desde DEBUG-MODE",
        detail: { origin: "DebugActionsPanel", note: "Generado manualmente para probar el pipeline de errores." },
      });
      showToast("Error simulado agregado al tab Errors.", "info");
    },
  },
  {
    key: "simulate-offline-toast",
    label: "Simular pérdida de conexión",
    description: "Dispara el evento 'offline' del navegador para probar el OfflineBanner sin desconectar el WiFi de verdad.",
    icon: <WifiOff className="h-4 w-4" />,
    run: ({ showToast }) => {
      window.dispatchEvent(new Event("offline"));
      showToast("Evento 'offline' disparado — recordá disparar 'online' después.", "warning");
    },
  },
  {
    key: "restore-online",
    label: "Restaurar conexión simulada",
    description: "Dispara el evento 'online' del navegador — contraparte de la acción anterior.",
    icon: <RotateCcw className="h-4 w-4" />,
    run: ({ showToast }) => {
      window.dispatchEvent(new Event("online"));
      showToast("Evento 'online' disparado.", "success");
    },
  },
];

export default function DebugActionsPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const handleClick = (action: DebugAction) => {
    if (action.danger && confirmingKey !== action.key) {
      setConfirmingKey(action.key);
      return;
    }
    setConfirmingKey(null);
    action.run({ queryClient, showToast });
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-text-tertiary">
        Acciones predefinidas — sin ejecución de código libre. Las marcadas en rojo piden una segunda confirmación.
      </p>
      {ACTIONS.map(action => {
        const isConfirming = confirmingKey === action.key;
        return (
          <button
            key={action.key}
            type="button"
            onClick={() => handleClick(action)}
            onBlur={() => isConfirming && setConfirmingKey(null)}
            className={`flex w-full items-start gap-3 rounded-control border p-3 text-left transition-colors cursor-pointer ${
              isConfirming
                ? "border-danger-300 bg-danger-50"
                : "border-border-default bg-white hover:bg-slate-50"
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${isConfirming ? "text-danger-600" : "text-slate-400"}`}>
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-xs font-black ${isConfirming ? "text-danger-700" : "text-text-primary"}`}>
                {isConfirming ? `¿Confirmar? — ${action.label}` : action.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-text-tertiary">{action.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
