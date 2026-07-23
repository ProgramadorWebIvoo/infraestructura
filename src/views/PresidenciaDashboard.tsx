/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { Project, ProjectStatus, AuditLog } from "../types";
import {
  DollarSign,
  Layers,
  CheckCircle2,
  Clock,
  Search,
  Activity,
  ArrowRight,
  MapPin,
  Eye,
} from "lucide-react";
import { SkeletonStats, SkeletonStatsDark, SkeletonTable, SkeletonCard } from "../components/SkeletonLoader";
import StatusBadge from "../components/UI/StatusBadge";
import { Table, type Column } from "../components/UI/Table";
import { getRoleColor } from "../utils";
import AuditInspectModal from "../components/Modals/AuditInspectModal";
import { containerVariants, itemVariants } from "../animations";

interface PresidenciaDashboardProps {
  projects: Project[];
  auditLogs: AuditLog[];
  onSelectProject: (project: Project) => void;
  isLoading?: boolean;
}

// ─── Column definitions (module-level: no closure over render state) ───

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

function getProjectColumns(onSelectProject: (p: Project) => void): Column<Project>[] {
  return [
    {
      key: "title",
      label: "Código / Obra",
      render: (p) => (
        <>
          <div className="font-mono text-sky-600 font-bold mb-0.5">{p.id}</div>
          <div className="font-sans font-bold text-slate-800 line-clamp-1">{p.title}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1 font-semibold">
            <span className={`w-1.5 h-1.5 rounded-full ${p.type === "INFRAESTRUCTURA" ? "bg-sky-500" : "bg-slate-400"}`} />
            {p.type} • Creado el {p.createdDate}
          </div>
        </>
      ),
    },
    {
      key: "location",
      label: "Ubicación",
      render: (p) => (
        <div className="flex items-center gap-1 text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="line-clamp-1 font-medium">{p.location}</span>
        </div>
      ),
    },
    { key: "estimatedTotal", label: "Estimado Materiales", render: (p) => <span className="font-mono font-bold text-slate-700">${p.estimatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> },
    {
      key: "finalContractValue",
      label: "Contrato Final",
      render: (p) => {
        const wp = p.proposals?.find(prop => prop.contractorCode === p.selectedContractorCode);
        const val = wp ? wp.totalCost : null;
        return val ? (
          <span className="font-mono font-black text-slate-900">${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        ) : (
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider italic">Sin contratar</span>
        );
      },
    },
    { key: "status", label: "Estado del Flujo", render: (p) => <StatusBadge code={p.status} /> },
    {
      key: "actions",
      label: "Detalle",
      align: "right",
      render: (p) => (
        <button
          id={`btn-inspect-${p.id}`}
          onClick={() => onSelectProject(p)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
        >
          Inspeccionar
          <ArrowRight className="h-3 w-3" />
        </button>
      ),
    },
  ];
}

// ─── Local presentational components (single-use) ───

function KpiCard({
  icon,
  label,
  accent,
  borderAccent,
  variant = "light",
  children,
}: {
  icon: ReactNode;
  label: string;
  accent: string;
  borderAccent: string;
  variant?: "light" | "dark";
  children: ReactNode;
}) {
  const dark = variant === "dark";
  const borderColor = dark ? "border-l-sky-500" : borderAccent;
  return (
    <div className={`rounded-2xl p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${dark ? "bg-slate-900 text-white border-slate-800" : "bg-white border-slate-200/80"} border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${dark ? "bg-sky-500/10" : "bg-gradient-to-br from-white to-slate-50 shadow-xs ring-1 ring-slate-200/60"}`}>
            <span className={dark ? "text-sky-400" : accent}>{icon}</span>
          </div>
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
        </div>
        {!dark && (
          <span className="text-[9px] font-mono text-slate-300 font-bold uppercase tracking-widest">IVOO</span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DonutChart({ percent, centerValue, centerLabel }: { percent: number; centerValue: string | number; centerLabel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const gradientId = `donut-grad-${centerLabel.replace(/\s+/g, "")}`;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="170" height="170" className="transform -rotate-90 drop-shadow-sm" role="img" aria-label={`Gráfico de distribución: ${centerLabel} ${centerValue}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        <circle
          cx="85" cy="85" r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-slate-800 font-mono">{centerValue}</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase font-sans">{centerLabel}</span>
      </div>
    </div>
  );
}

function DistributionBar({ color, label, count, percent }: { color: string; label: string; count: number; percent: number }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <span className={`w-3 h-3 rounded ${color} flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform duration-200`} />
        <span className="text-xs text-slate-600 font-bold group-hover:text-slate-900 transition-colors duration-200">{label}</span>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-1000 group-hover:scale-y-125 group-hover:origin-bottom`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-mono font-black text-slate-800 whitespace-nowrap w-20 text-right group-hover:text-slate-900 transition-colors duration-200">{count} ({percent}%)</span>
    </div>
  );
}

// ─── View ───

export default function PresidenciaDashboard({
  projects,
  auditLogs,
  onSelectProject,
  isLoading = false,
}: PresidenciaDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [inspectedAuditLog, setInspectedAuditLog] = useState<AuditLog | null>(null);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>("ALL");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  // ── Derived stats ──
  const totalProjectsCount = projects.length;
  const completedProjects = useMemo(() => projects.filter(p => p.status === ProjectStatus.COMPLETADO_PAGADO), [projects]);
  const activeProjects = useMemo(() => projects.filter(p => p.status !== ProjectStatus.COMPLETADO_PAGADO && p.status !== ProjectStatus.CREADO), [projects]);

  const { totalApprovedInvestment, totalReleasedFunds, pendingFunds, releasedPercent } = useMemo(() => {
    let totalApprovedInvestment = 0;
    let totalReleasedFunds = 0;
    projects.forEach(p => {
      totalApprovedInvestment += p.approvedInvestmentAmount ?? p.estimatedTotal;
      if (p.advancePaidAmount) totalReleasedFunds += p.advancePaidAmount;
      if (p.finalPaidAmount) totalReleasedFunds += p.finalPaidAmount;
    });
    return {
      totalApprovedInvestment,
      totalReleasedFunds,
      pendingFunds: Math.max(0, totalApprovedInvestment - totalReleasedFunds),
      releasedPercent: Math.round((totalReleasedFunds / (totalApprovedInvestment || 1)) * 100),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }), [projects, searchTerm, statusFilter, typeFilter]);

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

  if (isLoading) return <PresidenciaSkeleton />;

  const infraCount = projects.filter(p => p.type === "INFRAESTRUCTURA").length;
  const mantCount = projects.filter(p => p.type === "MANTENIMIENTO").length;
  const totalTypeCount = infraCount + mantCount || 1;
  const infraPercent = Math.round((infraCount / totalTypeCount) * 100);
  const mantPercent = Math.round((mantCount / totalTypeCount) * 100);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Presupuesto Aprobado" accent="text-sky-400" borderAccent="border-l-sky-500" variant="dark">
          <h3 className="text-2xl font-black font-mono bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent">${fmt(totalApprovedInvestment)}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Inversión autorizada en Base de Datos</p>
        </KpiCard>

        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Fondos Liquidados" accent="text-sky-600" borderAccent="border-l-sky-400">
          <h3 className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">${fmt(totalReleasedFunds)}</h3>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 to-sky-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${releasedPercent}%` }} />
            </div>
            <span className="text-[10px] font-mono font-bold text-sky-600">{releasedPercent}%</span>
          </div>
        </KpiCard>

        <KpiCard icon={<Clock className="h-5 w-5" />} label="Compromisos Pendientes" accent="text-rose-500" borderAccent="border-l-rose-400">
          <h3 className="text-2xl font-black font-mono bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent">${fmt(pendingFunds)}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Fondos retenidos por ejecutar o pagar</p>
        </KpiCard>

        <KpiCard icon={<Layers className="h-5 w-5" />} label="Estado de Proyectos" accent="text-sky-600" borderAccent="border-l-sky-400">
          <div className="flex items-baseline gap-1">
            <h3 className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{totalProjectsCount}</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Totales</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs shadow-sky-400/40" /> {activeProjects.length} Activos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" /> {completedProjects.length} Pagados
            </span>
          </div>
        </KpiCard>
      </motion.div>

      {/* Distribution chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1 h-5 rounded-full bg-sky-400" />
          <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">
            Distribución por Tipo de Obra
          </h4>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <DonutChart percent={infraPercent} centerValue={infraCount} centerLabel="Infraestructura" />
          </div>
          <div className="flex-1 space-y-4 w-full border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-8">
            <DistributionBar color="bg-sky-500" label="Infraestructura" count={infraCount} percent={infraPercent} />
            <DistributionBar color="bg-slate-400" label="Mantenimiento" count={mantCount} percent={mantPercent} />
          </div>
        </div>
      </motion.div>

      {/* Audit logs */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
                <Activity className="h-4 w-4 text-sky-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Trazabilidad en Tiempo Real</h3>
                <p className="text-[11px] text-slate-500 font-medium">Auditoría Base de Datos • Logs de Control del Sistema</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/40" />
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
                className="pl-10 pr-3.5 py-2 w-full text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold text-slate-700"
              />
            </div>
            <input
              id="audit-date-from"
              type="date"
              value={auditDateFrom}
              onChange={(e) => setAuditDateFrom(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer"
              title="Fecha desde"
            />
            <input
              id="audit-date-to"
              type="date"
              value={auditDateTo}
              onChange={(e) => setAuditDateTo(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer"
              title="Fecha hasta"
            />
            <select
              id="audit-filter-role"
              value={auditRoleFilter}
              onChange={(e) => setAuditRoleFilter(e.target.value)}
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
          columns={getAuditColumns(setInspectedAuditLog)}
          data={filteredAuditLogs}
          rowKey={(log) => log.id}
          emptyMessage="No hay logs registrados todavía."
          maxHeight="350px"
          stickyHeader
          containerClassName="border border-slate-100 rounded-lg"
          rowHoverClass="hover:bg-sky-50/30"
          pageSize={25}
        />
      </motion.div>

      {/* Master table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
                <Layers className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Master de Obras e Infraestructuras</h3>
                <p className="text-[11px] text-slate-500 font-medium">Visualización integrada de presupuestos, materiales, contratistas asignados y flujos.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-60">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="db-search"
                  type="text"
                  placeholder="Buscar por obra o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3.5 py-2 w-full text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold text-slate-700"
                />
              </div>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden font-bold cursor-pointer"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="INFRAESTRUCTURA">Infraestructura</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
              </select>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden font-bold cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                {Object.values(ProjectStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <Table
          columns={getProjectColumns(onSelectProject)}
          data={filteredProjects}
          rowKey={(p) => p.id}
          emptyMessage="No se encontraron obras con los filtros aplicados."
          maxHeight="350px"
          containerClassName="border border-slate-100 rounded-lg"
          pageSize={15}
        />
      </motion.div>

      <AuditInspectModal
        isOpen={!!inspectedAuditLog}
        log={inspectedAuditLog}
        onClose={() => setInspectedAuditLog(null)}
      />
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function PresidenciaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatsDark />
        <SkeletonStats />
        <SkeletonStats />
        <SkeletonStats />
      </div>
      <SkeletonCard />
      <SkeletonTable rows={4} columns={7} />
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}
