/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Histórico de Obras: una fila por obra con estimado / aprobado / adjudicado /
 * ejecutado y semáforo; al abrir una fila se ve la cadena completa
 * (obra → presupuesto → solicitud → proveedores → adjudicación → pagos → planos → cierre).
 */

import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { STATUS_LABELS } from "@ivoo/shared";
import { Table, type Column } from "@/components/UI/Table";
import StatusBadge from "@/components/UI/StatusBadge";
import EmptyState from "@/components/UI/EmptyState";
import Button from "@/components/UI/Button";
import { SearchInput, SelectFilter } from "@/components/UI/FilterBar";
import { SEMAPHORE_COLORS, useBudgetSemaphore } from "@/hooks/useBudgetSemaphore";
import { useProjectHistoryList } from "@/hooks/useProjectHistory";
import type { ProjectHistoryRow } from "../projectHistoryTypes";
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

const money = (n: number | null, empty = "—") => <span className="font-mono">{n === null ? empty : fmtMoney(n)}</span>;

export default function ProjectHistorySection({ authToken }: { authToken: string }) {
  const list = useProjectHistoryList(authToken);
  const { levelOf } = useBudgetSemaphore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: Column<ProjectHistoryRow>[] = [
    {
      key: "title",
      label: "Obra",
      render: (r) => (
        <div>
          <p className="font-semibold text-text-primary text-xs">{r.title}</p>
          <p className="text-[11px] text-text-tertiary font-mono">{r.id} · {r.createdDate ?? "—"}</p>
        </div>
      ),
    },
    { key: "status", label: "Estado", render: (r) => <StatusBadge code={r.status} /> },
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="history-search"
          value={list.filters.q}
          onChange={(v) => list.updateFilter("q", v)}
          placeholder="Buscar por código o título…"
          ariaLabel="Buscar obras en el histórico"
        />
        <SelectFilter id="history-status" value={list.filters.status} onChange={(v) => list.updateFilter("status", v)} ariaLabel="Filtrar por estado" options={STATUS_OPTIONS} />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
          <input type="checkbox" checked={list.filters.withAlerts} onChange={(e) => list.updateFilter("withAlerts", e.target.checked)} />
          Solo con alertas
        </label>
        {list.activeFilterCount > 0 && (
          <Button size="sm" variant="secondary" colorScheme="slate" onClick={list.clearFilters}>Limpiar filtros</Button>
        )}
        <Button size="sm" variant="secondary" colorScheme="slate" icon={<RefreshCw className={`h-3.5 w-3.5 ${list.isFetching ? "animate-spin" : ""}`} />} onClick={() => list.refetch()} className="ml-auto">
          Actualizar
        </Button>
      </div>

      {list.isError ? (
        <EmptyState message="No se pudo cargar el histórico de obras. Intenta actualizar." />
      ) : (
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey={(r) => r.id}
          isLoading={list.isLoading}
          emptyMessage="No hay obras que coincidan con los filtros."
          onRowClick={(r) => setSelectedId(r.id)}
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

      <ProjectHistoryDetailModal authToken={authToken} projectId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
