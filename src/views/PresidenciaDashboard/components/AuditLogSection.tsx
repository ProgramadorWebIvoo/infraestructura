/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de trazabilidad/auditoría — el corazón de los logs del flujo
 * general de la app (fuera de CONFIG APP, que tiene su propio historial vía
 * ConfigAuditLogPanel). Reescrita para paridad de calidad con ese panel:
 * filtros/paginación 100% server-side vía useAuditLogs (antes filtraba
 * client-side sobre el `auditLogs` acotado que trae useProjectsData para el
 * polling general — un registro más viejo que ese corte era invisible a
 * cualquier búsqueda), y exportación CSV del historial completo filtrado
 * (no solo la página en pantalla).
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, Download, Eye, Loader2, X } from "lucide-react";
import type { AuditLog } from "@/types";
import { Table, type Column } from "@/components/UI/Table";
import EmptyState from "@/components/UI/EmptyState";
import { SearchInput, SelectFilter } from "@/components/UI/FilterBar";
import DatePicker from "@/components/UI/DatePicker";
import { getRoleColor } from "@/utils";
import AuditInspectModal from "@/components/Modals/AuditInspectModal";
import { itemVariants } from "@/animations";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { downloadAuditLogsExport } from "@/services/api";
import { useToast } from "@/components/UI/Toast";

const AUDIT_ROLE_OPTIONS = [
  { value: "", label: "Todos los Roles" },
  { value: "PRESIDENCIA", label: "Presidencia" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura" },
  { value: "CIERRE_DE_OBRA", label: "Cierre de Obra" },
  { value: "PROCURA", label: "Procura" },
  { value: "ANALISTA", label: "Analistas" },
  { value: "FINANZAS", label: "Finanzas" },
  { value: "SISTEMA", label: "Sistema" },
];

function getAuditColumns(onInspect: (log: AuditLog) => void): Column<AuditLog>[] {
  return [
    { key: "timestamp", label: "Timestamp", render: (log) => <span className="text-[10px] font-mono text-slate-400 font-semibold whitespace-nowrap">{log.timestamp}</span> },
    { key: "role", label: "Rol", render: (log) => <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border ${getRoleColor(log.role)}`}>{log.role}</span> },
    { key: "projectTitle", label: "Proyecto", render: (log) => <span className="text-xs font-semibold text-slate-600 line-clamp-1 max-w-[200px] block">{log.projectTitle || <span className="text-slate-300 italic font-mono">—</span>}</span> },
    { key: "userName", label: "Usuario", render: (log) => log.userName ? <span className="text-xs font-semibold text-slate-700">{log.userName}</span> : <span className="text-[10px] text-slate-300 italic font-mono">—</span> },
    { key: "action", label: "Acción", render: (log) => <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[220px] block">{log.action}</span> },
    {
      key: "inspect",
      label: "",
      align: "right",
      render: (log) => (
        <button
          id={`btn-inspect-audit-${log.id}`}
          onClick={() => onInspect(log)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" />
          Inspeccionar
        </button>
      ),
    },
  ];
}

interface AuditLogSectionProps {
  authToken: string;
}

export default function AuditLogSection({ authToken }: AuditLogSectionProps) {
  const { showToast } = useToast();
  const [inspectedAuditLog, setInspectedAuditLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    logs, isLoading, page, lastPage, total, goToPage, refresh,
    filters, updateFilter, clearFilters, activeFilterCount, exportQuery,
  } = useAuditLogs(authToken, true);

  const auditColumns = useMemo(() => getAuditColumns(setInspectedAuditLog), []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadAuditLogsExport("audit-logs", exportQuery, authToken);
    } catch {
      showToast("No se pudo exportar el historial de auditoría.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div variants={itemVariants} className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden border-l-4 border-l-sky-400">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
              <Activity className="h-4 w-4 text-sky-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Trazabilidad en Tiempo Real</h2>
              <p className="text-[11px] text-slate-500 font-medium">Auditoría Base de Datos • Logs de Control del Sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold border border-slate-200">
              {total} {total === 1 ? "registro" : "registros"}
            </span>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || total === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar CSV
            </button>
          </div>
        </div>
        {/* ── Search + filter bar ── */}
        <div className="flex flex-wrap gap-2.5 mt-4">
          <SearchInput
            id="audit-search"
            value={filters.q}
            onChange={(v) => updateFilter("q", v)}
            placeholder="Buscar por acción, proyecto, usuario o detalles..."
            ariaLabel="Buscar en auditoría"
          />
          <DatePicker
            id="audit-date-from"
            value={filters.dateFrom}
            onChange={(v) => updateFilter("dateFrom", v)}
            max={filters.dateTo || undefined}
            ariaLabel="Fecha desde"
            className="w-36"
          />
          <DatePicker
            id="audit-date-to"
            value={filters.dateTo}
            onChange={(v) => updateFilter("dateTo", v)}
            min={filters.dateFrom || undefined}
            ariaLabel="Fecha hasta"
            className="w-36"
          />
          <SelectFilter
            id="audit-filter-role"
            value={filters.role}
            onChange={(v) => updateFilter("role", v)}
            ariaLabel="Filtrar por rol"
            options={AUDIT_ROLE_OPTIONS}
          />
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
      <Table
        columns={auditColumns}
        data={logs}
        rowKey={(log) => log.id}
        isLoading={isLoading}
        emptyMessage="No hay logs registrados todavía."
        emptyState={<EmptyState message="No hay logs que coincidan con los filtros aplicados." />}
        fillViewport
        stickyHeader
        containerClassName="border border-slate-100 rounded-lg mx-5 mb-5 flex-1 min-h-0"
        rowHoverClass="hover:bg-sky-50/30"
        onRefresh={refresh}
      />

      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-2 px-5 pb-5 shrink-0">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isLoading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Anterior
          </button>
          <span className="text-[11px] font-semibold text-slate-500">
            Página {page} de {lastPage}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= lastPage || isLoading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      )}

      <AuditInspectModal
        isOpen={!!inspectedAuditLog}
        log={inspectedAuditLog}
        onClose={() => setInspectedAuditLog(null)}
      />
    </motion.div>
  );
}
