/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de trazabilidad/auditoría — extraída de PresidenciaDashboard.
 * La etiqueta de sincronización muestra el tiempo real desde el último poll
 * (honesta: el dashboard se actualiza cada 25s, no es "EN VIVO").
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, Eye } from "lucide-react";
import type { AuditLog } from "@/types";
import { Table, type Column } from "@/components/UI/Table";
import EmptyState from "@/components/UI/EmptyState";
import { SearchInput, SelectFilter } from "@/components/UI/FilterBar";
import DatePicker from "@/components/UI/DatePicker";
import { getRoleColor } from "@/utils";
import AuditInspectModal from "@/components/Modals/AuditInspectModal";
import { itemVariants } from "@/animations";

const AUDIT_ROLE_OPTIONS = [
  { value: "ALL", label: "Todos los Roles" },
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
  auditLogs: AuditLog[];
  lastSync?: Date | null;
  onRefresh?: () => Promise<void> | void;
}

export default function AuditLogSection({ auditLogs, lastSync = null, onRefresh }: AuditLogSectionProps) {
  const [inspectedAuditLog, setInspectedAuditLog] = useState<AuditLog | null>(null);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>("ALL");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  const auditColumns = useMemo(() => getAuditColumns(setInspectedAuditLog), []);

  const filteredAuditLogs = useMemo(() => auditLogs.filter(log => {
    const term = auditSearchTerm.toLowerCase();
    const matchesSearch = !term
      || log.action.toLowerCase().includes(term)
      || log.projectTitle.toLowerCase().includes(term)
      || log.projectId.toLowerCase().includes(term)
      || (log.userName ?? "").toLowerCase().includes(term)
      || (log.details ?? "").toLowerCase().includes(term);
    const matchesRole = auditRoleFilter === "ALL" || log.role === auditRoleFilter;
    const logDate = log.timestamp.slice(0, 10);
    const matchesDateFrom = !auditDateFrom || logDate >= auditDateFrom;
    const matchesDateTo = !auditDateTo || logDate <= auditDateTo;
    return matchesSearch && matchesRole && matchesDateFrom && matchesDateTo;
  }), [auditLogs, auditSearchTerm, auditRoleFilter, auditDateFrom, auditDateTo]);

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
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold border border-slate-200">
            {filteredAuditLogs.length}/{auditLogs.length} registros
          </span>
        </div>
        {/* ── Search + filter bar ── */}
        <div className="flex flex-wrap gap-2.5 mt-4">
          <SearchInput
            id="audit-search"
            value={auditSearchTerm}
            onChange={setAuditSearchTerm}
            placeholder="Buscar por acción, proyecto, usuario o detalles..."
            ariaLabel="Buscar en auditoría"
          />
          <DatePicker
            id="audit-date-from"
            value={auditDateFrom}
            onChange={setAuditDateFrom}
            ariaLabel="Fecha desde"
            className="w-36"
          />
          <DatePicker
            id="audit-date-to"
            value={auditDateTo}
            onChange={setAuditDateTo}
            ariaLabel="Fecha hasta"
            className="w-36"
          />
          <SelectFilter
            id="audit-filter-role"
            value={auditRoleFilter}
            onChange={setAuditRoleFilter}
            ariaLabel="Filtrar por rol"
            options={AUDIT_ROLE_OPTIONS}
          />
        </div>
      </div>
      <Table
        columns={auditColumns}
        data={filteredAuditLogs}
        rowKey={(log) => log.id}
        emptyMessage="No hay logs registrados todavía."
        emptyState={<EmptyState message="No hay logs que coincidan con los filtros aplicados." />}
        fillViewport
        stickyHeader
        containerClassName="border border-slate-100 rounded-lg mx-5 mb-5 flex-1 min-h-0"
        rowHoverClass="hover:bg-sky-50/30"
        pageSize={25}
        onRefresh={onRefresh}
        lastUpdated={lastSync}
      />

      <AuditInspectModal
        isOpen={!!inspectedAuditLog}
        log={inspectedAuditLog}
        onClose={() => setInspectedAuditLog(null)}
      />
    </motion.div>
  );
}
