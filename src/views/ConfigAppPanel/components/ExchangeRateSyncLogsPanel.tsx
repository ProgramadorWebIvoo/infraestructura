/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel para ver el historial de sincronizaciones de tasas.
 * Muestra última ejecución exitosa y lista de intentos (éxito/fallo).
 */

import { Check, X, Clock, Plus } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import { formatBs } from "@/hooks/useCurrencyConversion";
import type { SyncLog } from "@/hooks/useExchangeRateSyncLogs";

interface ExchangeRateSyncLogsPanelProps {
  logs: SyncLog[];
  lastSync: SyncLog | null;
  isLoading: boolean;
  onEditRate?: () => void;
}

export default function ExchangeRateSyncLogsPanel({
  logs,
  lastSync,
  isLoading,
  onEditRate,
}: ExchangeRateSyncLogsPanelProps) {
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
      render: (row) =>
        row.source === "DOLARVZLA_API"
          ? "DolarVZLA API"
          : row.source === "BCV_SCRAPING"
            ? "BCV Scraping"
            : row.source || "-",
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
          onEditRate ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-4 w-4" />}
              onClick={onEditRate}
            >
              Cargar Tasa
            </Button>
          ) : undefined
        }
      />

      {/* Resumen última sincronización */}
      {lastSync && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Última sincronización exitosa
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
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {lastSync.rates_synced}
              </div>
              <p className="text-xs text-text-secondary">tasas sincronizadas</p>
            </div>
          </div>
        </Card>
      )}

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
