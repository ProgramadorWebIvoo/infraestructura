/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de trazabilidad/auditoría — extraída de PresidenciaDashboard.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, Eye, Search } from "lucide-react";
import type { AuditLog } from "../../types";
import { Table, type Column } from "../../components/UI/Table";
import { getRoleColor } from "../../utils";
import AuditInspectModal from "../../components/Modals/AuditInspectModal";
import { itemVariants } from "../../animations";

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
}

export default function AuditLogSection({ auditLogs }: AuditLogSectionProps) {
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
    <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
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
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/40" />
              <span className="text-[10px] font-mono text-slate-500 font-bold">EN VIVO</span>
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold border border-slate-200">
              {auditLogs.length} registros
            </span>
          </div>
        </div>
        {/* ── Search + filter bar ── */}
        <div className="flex flex-wrap gap-2.5 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="audit-search"
                type="text"
                placeholder="Buscar por acción, proyecto, usuario o detalles..."
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
                aria-label="Buscar en auditoría"
                className="pl-10 pr-3.5 py-2 w-full text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold text-slate-700"
              />
            </div>
            <input
              id="audit-date-from"
              type="date"
              value={auditDateFrom}
              onChange={(e) => setAuditDateFrom(e.target.value)}
              aria-label="Fecha desde"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer"
              title="Fecha desde"
            />
            <input
              id="audit-date-to"
              type="date"
              value={auditDateTo}
              onChange={(e) => setAuditDateTo(e.target.value)}
              aria-label="Fecha hasta"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer"
              title="Fecha hasta"
            />
            <select
              id="audit-filter-role"
              value={auditRoleFilter}
              onChange={(e) => setAuditRoleFilter(e.target.value)}
              aria-label="Filtrar por rol"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden font-bold cursor-pointer"
            >
            <option value="ALL">Todos los Roles</option>
            <option value="PRESIDENCIA">Presidencia</option>
            <option value="INFRAESTRUCTURA">Infraestructura</option>
            <option value="CIERRE_DE_OBRA">Cierre de Obra</option>
            <option value="PROCURA">Procura</option>
            <option value="ANALISTA">Analistas</option>
            <option value="FINANZAS">Finanzas</option>
            <option value="SISTEMA">Sistema</option>
          </select>
        </div>
      </div>
      <Table
        columns={auditColumns}
        data={filteredAuditLogs}
        rowKey={(log) => log.id}
        emptyMessage="No hay logs registrados todavía."
        maxHeight="350px"
        stickyHeader
        containerClassName="border border-slate-100 rounded-lg"
        rowHoverClass="hover:bg-sky-50/30"
        pageSize={25}
      />

      <AuditInspectModal
        isOpen={!!inspectedAuditLog}
        log={inspectedAuditLog}
        onClose={() => setInspectedAuditLog(null)}
      />
    </motion.div>
  );
}
