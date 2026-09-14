/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel para ver el historial de sincronizaciones de tasas.
 * Muestra última ejecución exitosa y lista de intentos (éxito/fallo).
 */

import { Check, X, Clock, Plus, RefreshCw, AlertTriangle, CalendarClock } from "lucide-react";
import { useState } from "react";
import { Table, type Column } from "@/components/UI/Table";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import InfoBanner from "@/components/UI/InfoBanner";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage } from "@/services/logger";
import { formatBs } from "@/hooks/useCurrencyConversion";
import type { SyncLog } from "@/hooks/useExchangeRateSyncLogs";
import type { SyncResponse, SyncDebugTraceEntry } from "@/hooks/useExchangeRates";

interface ExchangeRateSyncLogsPanelProps {
  logs: SyncLog[];
  lastSync: SyncLog | null;
  isLoading: boolean;
  onEditRate?: () => void;
  onSyncNow?: () => Promise<SyncResponse | void>;
  isSyncing?: boolean;
  /** Configuración vigente del cronjob (Monedas > Sincronización de tasa) — para mostrar cuándo corre la próxima sincronización automática. */
  cronHour?: string;
  cronEnabled?: boolean;
}

function sourceLabel(source: string | null): string {
  if (source === "DOLARVZLA_API") return "DolarVZLA API";
  if (source === "BCV_SCRAPING") return "BCV Scraping";
  return source || "-";
}

/** "hace 5 min" / "hace 3 h" / "hace 2 d" — misma idea que AuditLogSection.timeAgo, pero con soporte de días porque el sync corre solo días hábiles. */
function timeAgo(isoDate: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (seconds < 60) return "hace instantes";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function ExchangeRateSyncLogsPanel({
  logs,
  lastSync,
  isLoading,
  onEditRate,
  onSyncNow,
  isSyncing,
  cronHour,
  cronEnabled,
}: ExchangeRateSyncLogsPanelProps) {
  const { showToast } = useToast();
  const [debugTrace, setDebugTrace] = useState<SyncDebugTraceEntry[] | null>(null);

  const handleSync = async () => {
    if (!onSyncNow) return;
    try {
      const result = await onSyncNow();
      setDebugTrace(result?.debug ?? null);
      showToast(result?.message || "Tasas sincronizadas exitosamente", result?.success === false ? "error" : "success");
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo sincronizar las tasas."), "error");
    }
  };

  const successRate = logs.length > 0
    ? Math.round((logs.filter((l) => l.status === "SUCCESS").length / logs.length) * 100)
    : 0;

  const columns: Column<SyncLog>[] = [
    {
      key: "executed_at",
      label: "Fecha",
      width: "25%",
      render: (row) =>
        new Date(row.executed_at).toLocaleDateString("es-VE", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "status",
      label: "Estado",
      width: "15%",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "SUCCESS" ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-semibold text-sm">Éxito</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-red-600 font-semibold text-sm">Fallo</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "source",
      label: "Fuente",
      width: "20%",
      render: (row) => sourceLabel(row.source),
    },
    {
      key: "rates_synced",
      label: "Tasas",
      width: "15%",
      align: "center",
      render: (row) => (
        <span className="font-semibold text-sky-600">{row.rates_synced}</span>
      ),
    },
    {
      key: "error_message",
      label: "Detalles",
      width: "25%",
      render: (row) =>
        row.error_message ? (
          <span className="text-xs text-text-tertiary truncate" title={row.error_message}>
            {row.error_message}
          </span>
        ) : (
          <span className="text-text-tertiary">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<Clock className="h-5 w-5" />}
        title="Historial de Sincronización"
        description="Últimas sincronizaciones automáticas y manuales"
        color="sky"
        actions={
          (onSyncNow || onEditRate) && (
            <div className="flex items-center gap-2">
              {onSyncNow && (
                <Button
                  size="sm"
                  variant="primary"
                  colorScheme="sky"
                  isLoading={isSyncing}
                  icon={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
                  onClick={handleSync}
                >
                  {isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </Button>
              )}
              {onEditRate && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={onEditRate}
                >
                  Cargar Tasa
                </Button>
              )}
            </div>
          )
        }
      />

      {/* Detalle de fuentes intentadas — solo aparece si el modo debug está activo (ver Monedas > Sincronización de tasa) */}
      {debugTrace && debugTrace.length > 0 && (
        <InfoBanner title="Detalle de la última sincronización (modo debug)" defaultOpen>
          <ul className="space-y-1 font-mono">
            {debugTrace.map((entry, idx) => (
              <li key={idx}>
                {entry.success ? "✅" : "❌"} {entry.source} — {entry.duration_ms}ms — {entry.message}
              </li>
            ))}
          </ul>
        </InfoBanner>
      )}

      {/* El intento más reciente (logs[0], no necesariamente exitoso) difiere de lastSync
          (último éxito) cuando el sync automático o manual más reciente falló — se avisa
          aparte porque de lo contrario la tarjeta verde de abajo oculta un fallo vigente. */}
      {(() => {
        const lastAttempt = logs[0];
        if (!lastAttempt || lastAttempt.status !== "FAILURE") return null;
        return (
          <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  El último intento de sincronización falló ({timeAgo(lastAttempt.executed_at)})
                </p>
                <p className="text-xs text-red-700/80 mt-0.5">
                  {new Date(lastAttempt.executed_at).toLocaleDateString("es-VE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {lastAttempt.error_message ? ` — ${lastAttempt.error_message}` : ""}
                </p>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Resumen última sincronización exitosa */}
      {lastSync ? (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Última sincronización exitosa
                <span className="rounded-pill bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  {timeAgo(lastSync.executed_at)}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {new Date(lastSync.executed_at).toLocaleDateString("es-VE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Fuente: <span className="font-semibold text-text-primary">{sourceLabel(lastSync.source)}</span>
              </p>
              {cronHour && (
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {cronEnabled
                    ? `Próxima automática: lunes a viernes, ${cronHour} (hora VE)`
                    : "Sincronización automática desactivada — solo manual"}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {lastSync.rates_synced}
              </div>
              <p className="text-xs text-text-secondary">tasas sincronizadas</p>
            </div>
          </div>
        </Card>
      ) : logs.length > 0 ? (
        <EmptyState message="Todavía no hay ninguna sincronización exitosa — revisa el detalle del último intento arriba." />
      ) : null}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-sm text-text-secondary">Total registros</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {logs.length}
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-sm text-text-secondary">Exitosas</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {logs.filter((l) => l.status === "SUCCESS").length}
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-sm text-text-secondary">Tasa de éxito</div>
            <div className="text-2xl font-bold text-sky-600 mt-1">
              {successRate}%
            </div>
          </div>
        </Card>
      </div>

      {/* Tabla de logs */}
      {logs.length === 0 ? (
        <EmptyState message="No hay registros de sincronización todavía." />
      ) : (
        <Table<SyncLog>
          columns={columns}
          data={logs}
          rowKey={(log) => log.id}
          isLoading={isLoading}
          emptyMessage="No hay registros de sincronización."
          pageSize={10}
        />
      )}
    </div>
  );
}
