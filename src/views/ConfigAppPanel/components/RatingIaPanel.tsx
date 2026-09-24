/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel del cronjob de RatingIA: disparo manual del batch, historial de
 * corridas y sugerencias vigentes por proveedor — mismo layout que
 * ExchangeRateSyncLogsPanel (tarjeta de última corrida + stats + tabla),
 * más una segunda tabla de sugerencias que ese panel no necesita.
 */

import { Check, X, Clock, RefreshCw, AlertTriangle, BrainCircuit } from "lucide-react";
import { Table, type Column } from "@/components/UI/Table";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage } from "@/services/logger";
import type { RatingIaRunLog, ContractorRatingSuggestionRecord, RunResponse } from "@/hooks/useRatingIaBatch";

interface RatingIaPanelProps {
  runLogs: RatingIaRunLog[];
  suggestions: ContractorRatingSuggestionRecord[];
  isLoading: boolean;
  isRunning: boolean;
  onRunNow: () => Promise<RunResponse | void>;
  cronFrecuenciaDias?: string;
  cronEnabled?: boolean;
  onRefreshLogs?: () => Promise<void> | void;
  onRefreshSuggestions?: () => Promise<void> | void;
}

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

const STATUS_LABEL: Record<RatingIaRunLog["status"], { label: string; className: string; icon: typeof Check }> = {
  success: { label: "Éxito", className: "text-green-600", icon: Check },
  partial: { label: "Parcial", className: "text-amber-600", icon: AlertTriangle },
  failed: { label: "Fallo", className: "text-red-600", icon: X },
};

export default function RatingIaPanel({
  runLogs,
  suggestions,
  isLoading,
  isRunning,
  onRunNow,
  cronFrecuenciaDias,
  cronEnabled,
  onRefreshLogs,
  onRefreshSuggestions,
}: RatingIaPanelProps) {
  const { showToast } = useToast();

  const handleRun = async () => {
    try {
      const result = await onRunNow();
      const log = result?.data;
      showToast(
        log
          ? `Corrida completada: ${log.contractors_evaluated} evaluados, ${log.suggestions_generated} sugerencias, ${log.errors_count} errores.`
          : "Corrida completada.",
        log?.status === "failed" ? "error" : "success",
      );
    } catch (err) {
      showToast(getErrorMessage(err, "No se pudo ejecutar el batch de RatingIA."), "error");
    }
  };

  const lastRun = runLogs[0] ?? null;

  const logColumns: Column<RatingIaRunLog>[] = [
    {
      key: "started_at",
      label: "Fecha",
      width: "25%",
      render: row =>
        new Date(row.started_at).toLocaleDateString("es-VE", {
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
      render: row => {
        const meta = STATUS_LABEL[row.status];
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${meta.className}`} />
            <span className={`font-semibold text-sm ${meta.className}`}>{meta.label}</span>
          </div>
        );
      },
    },
    { key: "contractors_evaluated", label: "Evaluados", width: "15%", align: "center", render: row => row.contractors_evaluated },
    { key: "suggestions_generated", label: "Sugerencias", width: "15%", align: "center", render: row => row.suggestions_generated },
    { key: "errors_count", label: "Errores", width: "10%", align: "center", render: row => row.errors_count },
    {
      key: "error_message",
      label: "Detalles",
      width: "20%",
      render: row =>
        row.error_message ? (
          <span className="text-xs text-text-tertiary truncate" title={row.error_message}>
            {row.error_message}
          </span>
        ) : (
          <span className="text-text-tertiary">-</span>
        ),
    },
  ];

  const suggestionColumns: Column<ContractorRatingSuggestionRecord>[] = [
    {
      key: "contractor",
      label: "Proveedor",
      width: "30%",
      render: row => (
        <div>
          <p className="font-semibold text-text-primary text-sm">{row.contractor?.name ?? row.contractor_code}</p>
          <p className="text-xs text-text-tertiary font-mono">{row.contractor_code}</p>
        </div>
      ),
    },
    {
      key: "current_rating",
      label: "Rating actual",
      width: "15%",
      align: "center",
      render: row => (row.current_rating !== null ? row.current_rating.toFixed(1) : "N/A"),
    },
    {
      key: "suggested_rating",
      label: "Sugerido IA",
      width: "15%",
      align: "center",
      render: row => (
        <span className="font-mono font-bold text-amber-600">
          {row.suggested_rating !== null ? row.suggested_rating.toFixed(1) : "N/A"}
        </span>
      ),
    },
    {
      key: "confidence_score",
      label: "Confianza",
      width: "10%",
      align: "center",
      render: row => `${row.confidence_score}%`,
    },
    {
      key: "rationale",
      label: "Justificación",
      width: "30%",
      render: row => (
        <span className="text-xs text-text-tertiary truncate" title={row.rationale ?? undefined}>
          {row.rationale ?? "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<BrainCircuit className="h-5 w-5" />}
        title="Cronjob de RatingIA"
        description="Evaluación automática (batch) de sugerencia de rating IA para todos los proveedores activos. No autoritativo: no modifica el rating, solo lo sugiere."
        color="purple"
        actions={
          <Button
            size="sm"
            variant="primary"
            colorScheme="purple"
            isLoading={isRunning}
            icon={<RefreshCw className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`} />}
            onClick={handleRun}
          >
            {isRunning ? "Ejecutando..." : "Ejecutar ahora"}
          </Button>
        }
      />

      {lastRun && (
        <Card
          className={
            lastRun.status === "failed"
              ? "bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500"
              : "bg-gradient-to-r from-purple-50 to-violet-50 border-l-4 border-purple-500"
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                {lastRun.status === "failed" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <Check className="h-4 w-4 text-purple-600" />
                )}
                Última corrida
                <span className="rounded-pill bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  {timeAgo(lastRun.started_at)}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {new Date(lastRun.started_at).toLocaleDateString("es-VE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {lastRun.error_message && <p className="text-xs text-red-700 mt-1">{lastRun.error_message}</p>}
              {cronFrecuenciaDias && (
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {cronEnabled
                    ? `Próxima automática: cada ${cronFrecuenciaDias} días`
                    : "Evaluación automática desactivada — solo disparo manual"}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{lastRun.suggestions_generated}</div>
              <p className="text-xs text-text-secondary">sugerencias generadas</p>
            </div>
          </div>
        </Card>
      )}

      {runLogs.length === 0 ? (
        <EmptyState message="Todavía no hay ninguna corrida del batch de RatingIA." />
      ) : (
        <Table<RatingIaRunLog>
          columns={logColumns}
          data={runLogs}
          rowKey={log => log.id}
          isLoading={isLoading}
          emptyMessage="No hay corridas registradas."
          pageSize={10}
          onRefresh={onRefreshLogs}
        />
      )}

      <SectionHeader
        icon={<BrainCircuit className="h-5 w-5" />}
        title="Sugerencias vigentes por proveedor"
        description="Última sugerencia de rating IA por proveedor, generada por el batch o por consulta puntual."
        color="amber"
      />

      {suggestions.length === 0 ? (
        <EmptyState message="Todavía no hay sugerencias de rating IA generadas." />
      ) : (
        <Table<ContractorRatingSuggestionRecord>
          columns={suggestionColumns}
          data={suggestions}
          rowKey={row => row.id}
          isLoading={isLoading}
          emptyMessage="No hay sugerencias."
          pageSize={10}
          onRefresh={onRefreshSuggestions}
        />
      )}
    </div>
  );
}
