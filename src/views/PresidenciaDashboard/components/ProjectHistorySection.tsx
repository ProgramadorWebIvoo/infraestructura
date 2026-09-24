/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico de Obras: una fila por obra con estimado / aprobado / adjudicado /
 * ejecutado y semáforo; al abrir una fila se ve la cadena completa
 * (obra → presupuesto → solicitud → proveedores → adjudicación → pagos → planos → cierre).
 * Reemplaza al antiguo Master de Obras (filtros, exportación y proveedor incluidos).
 */

import { AlertTriangle, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, RefreshCw, Star } from "lucide-react";
import { STATUS_LABELS } from "@ivoo/shared";
import type { Project } from "@/types";
import { Table, type Column } from "@/components/UI/Table";
import StatusBadge from "@/components/UI/StatusBadge";
import EmptyState from "@/components/UI/EmptyState";
import Button from "@/components/UI/Button";
import DatePicker from "@/components/UI/DatePicker";
import ExportButton from "@/components/UI/ExportButton";
import { SearchInput, SelectFilter } from "@/components/UI/FilterBar";
import { SEMAPHORE_COLORS, useBudgetSemaphore } from "@/hooks/useBudgetSemaphore";
import { useProjectHistoryList } from "@/hooks/useProjectHistory";
import type { ProjectHistoryRow } from "../projectHistoryTypes";
import { HISTORY_EXPORT_COLUMNS, HISTORY_EXPORT_HEADERS, toExportRow } from "../historyExport";
import { fmtMoney, fmtPct } from "./ProjectHistoryFigures";
import ProjectHistoryDetailModal from "./ProjectHistoryDetailModal";

const PROJECT_STATUS_CODES = [
  "CREADO", "RECHAZADO_CIERRE", "REVISADO_CIERRE", "EN_REEVALUACION_CIERRE", "CONFIRMADO_PROCURA", "COMPARATIVA_ENVIADA",
  "CONTRATADO", "EN_EJECUCION", "VERIFICANDO_FINALIZACION", "LISTO_PAGO_FINAL", "COMPLETADO_PAGADO",
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  ...PROJECT_STATUS_CODES.map((value) => ({ value, label: STATUS_LABELS[value] ?? value })),
];

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
];

const money = (n: number | null, empty = "—") => <span className="font-mono">{n === null ? empty : fmtMoney(n)}</span>;

interface ProjectHistorySectionProps {
  authToken: string;
  /** Obras ya cargadas por la app: alimentan las pestañas de flujo/organigrama del detalle. */
  projects: Project[];
  /** Obra abierta en el detalle (controlada por el padre: otras secciones, como obras estancadas, también la abren). */
  selectedId: string | null;
  onSelect: (projectId: string | null) => void;
}

export default function ProjectHistorySection({ authToken, projects, selectedId, onSelect }: ProjectHistorySectionProps) {
  const list = useProjectHistoryList(authToken);
  const { levelOf } = useBudgetSemaphore();

  const columns: Column<ProjectHistoryRow>[] = [
    {
      key: "title",
      label: "Obra",
      width: "22%",
      render: (r) => (
        <div>
          <p className="font-semibold text-text-primary text-xs">{r.title}</p>
          <p className="text-[11px] text-text-tertiary font-mono">{r.id} · {r.createdDate ?? "—"}</p>
          {r.location && <p className="text-[11px] text-text-tertiary">{r.location}</p>}
        </div>
      ),
    },
    { key: "status", label: "Estado", render: (r) => <StatusBadge code={r.status} /> },
    {
      key: "contractor",
      label: "Proveedor",
      render: (r) => r.contractor ? (
        <div>
          <p className="text-xs font-semibold text-text-primary line-clamp-1">{r.contractor.name ?? r.contractor.code}</p>
          {r.contractor.rating !== null && (
            <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />{r.contractor.rating.toFixed(1)}
            </p>
          )}
        </div>
      ) : <span className="text-[11px] text-text-tertiary">Sin contratar</span>,
    },
    { key: "estimated", label: "Estimado", align: "right", render: (r) => money(r.figures.estimated) },
    { key: "approved", label: "Aprobado", align: "right", render: (r) => money(r.figures.approved, "Sin aprobar") },
    {
      key: "awarded",
      label: "Adjudicado",
      align: "right",
      render: (r) => (
        <div className="text-right">
          {money(r.figures.awarded, "—")}
          {r.figures.variation.awardedVsApproved !== null && (
            <p className="text-[10px] text-text-tertiary font-mono">{fmtPct(r.figures.variation.awardedVsApproved)} vs aprob.</p>
          )}
        </div>
      ),
    },
    { key: "executed", label: "Ejecutado", align: "right", render: (r) => money(r.figures.executed) },
    {
      key: "execution",
      label: "Ejecución",
      align: "center",
      render: (r) => {
        const pct = r.figures.executionPercent;
        if (pct === null) return <span className="text-[11px] text-text-tertiary">—</span>;
        const sem = SEMAPHORE_COLORS[levelOf(pct)];
        return (
          <span className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-bold ${sem.bg} ${sem.text}`}>
            {pct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%
          </span>
        );
      },
    },
    {
      key: "alerts",
      label: "",
      align: "center",
      render: (r) => {
        const f = r.figures.flags;
        const hasAlert = f.awardedExceedsApproved || f.executedExceedsAwarded || f.executedExceedsApproved;
        return hasAlert ? <AlertTriangle className="h-4 w-4 text-danger-600 inline" aria-label="Con alertas de presupuesto" /> : null;
      },
    },
  ];

  const data = list.data;
  const exportProps = {
    filename: `historico-obras-${new Date().toISOString().slice(0, 10)}`,
    headers: HISTORY_EXPORT_HEADERS,
    columns: HISTORY_EXPORT_COLUMNS,
    title: "Histórico de Obras",
    subtitle: `Generado el ${new Date().toLocaleString("es-ES", { dateStyle: "long" })}${list.activeFilterCount > 0 ? " · con filtros aplicados" : ""}`,
    rows: async () => (await list.fetchAllRows()).map(toExportRow),
    disabled: !data || data.total === 0 || list.invalidRange,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="history-search"
          value={list.filters.q}
          onChange={(v) => list.updateFilter("q", v)}
          placeholder="Buscar por código, obra o ubicación…"
          ariaLabel="Buscar obras en el histórico"
        />
        <SelectFilter id="history-type" value={list.filters.type} onChange={(v) => list.updateFilter("type", v)} ariaLabel="Filtrar por tipo" options={TYPE_OPTIONS} />
        <SelectFilter id="history-status" value={list.filters.status} onChange={(v) => list.updateFilter("status", v)} ariaLabel="Filtrar por estado" options={STATUS_OPTIONS} />
        <DatePicker id="history-date-from" value={list.filters.dateFrom} onChange={(v) => list.updateFilter("dateFrom", v)} max={list.filters.dateTo || undefined} ariaLabel="Creada desde" className="w-40" />
        <DatePicker id="history-date-to" value={list.filters.dateTo} onChange={(v) => list.updateFilter("dateTo", v)} min={list.filters.dateFrom || undefined} ariaLabel="Creada hasta" className="w-40" />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
          <input type="checkbox" checked={list.filters.withAlerts} onChange={(e) => list.updateFilter("withAlerts", e.target.checked)} />
          Solo con alertas
        </label>
        {list.activeFilterCount > 0 && (
          <Button size="sm" variant="secondary" colorScheme="slate" onClick={list.clearFilters}>Limpiar filtros</Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ExportButton format="csv" {...exportProps} icon={<Download className="h-3.5 w-3.5" />} aria-label="Exportar histórico a CSV" className="px-3 py-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100">CSV</ExportButton>
          <ExportButton format="excel" {...exportProps} icon={<FileSpreadsheet className="h-3.5 w-3.5" />} aria-label="Exportar histórico a Excel" className="px-3 py-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100">Excel</ExportButton>
          <ExportButton format="pdf" {...exportProps} icon={<FileText className="h-3.5 w-3.5" />} aria-label="Exportar histórico a PDF" className="px-3 py-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100">PDF</ExportButton>
          <Button size="sm" variant="secondary" colorScheme="slate" icon={<RefreshCw className={`h-3.5 w-3.5 ${list.isFetching ? "animate-spin" : ""}`} />} onClick={() => list.refetch()}>
            Actualizar
          </Button>
        </div>
      </div>

      {list.invalidRange && (
        <p role="alert" className="text-xs font-semibold text-danger-700">La fecha "desde" no puede ser posterior a la fecha "hasta".</p>
      )}

      {list.isError ? (
        <EmptyState message="No se pudo cargar el histórico de obras. Intenta actualizar." />
      ) : (
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey={(r) => r.id}
          isLoading={list.isLoading}
          emptyMessage="No hay obras que coincidan con los filtros."
          onRowClick={(r) => onSelect(r.id)}
        />
      )}

      {data && data.lastPage > 1 && (
        <nav className="flex items-center justify-between text-xs text-text-secondary" aria-label="Paginación del histórico">
          <span>{data.total} obras · página {data.currentPage} de {data.lastPage}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" colorScheme="slate" icon={<ChevronLeft className="h-3.5 w-3.5" />} disabled={list.page <= 1} onClick={() => list.goToPage(list.page - 1)}>Anterior</Button>
            <Button size="sm" variant="secondary" colorScheme="slate" icon={<ChevronRight className="h-3.5 w-3.5" />} disabled={list.page >= data.lastPage} onClick={() => list.goToPage(list.page + 1)}>Siguiente</Button>
          </div>
        </nav>
      )}

      <ProjectHistoryDetailModal authToken={authToken} projectId={selectedId} projects={projects} onClose={() => onSelect(null)} />
    </div>
  );
}
