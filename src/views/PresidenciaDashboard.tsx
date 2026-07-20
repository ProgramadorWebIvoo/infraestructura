/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Project, ProjectStatus, AuditLog } from "../types";
import { 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  Activity, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  MapPin
} from "lucide-react";
import { SkeletonStats, SkeletonStatsDark, SkeletonBlock, SkeletonTable, SkeletonCard } from "../components/SkeletonLoader";
import StatusBadge from "../components/UI/StatusBadge";
import { Table, type Column } from "../components/UI/Table";
import { getRoleColor } from "../utils";

interface PresidenciaDashboardProps {
  projects: Project[];
  auditLogs: AuditLog[];
  onSelectProject: (project: Project) => void;
  isLoading?: boolean;
}

export default function PresidenciaDashboard({
  projects,
  auditLogs,
  onSelectProject,
  isLoading = false,
}: PresidenciaDashboardProps) {
  if (isLoading) return <PresidenciaSkeleton />;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Calculate stats
  const totalProjectsCount = projects.length;
  const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETADO_PAGADO);
  const activeProjects = projects.filter(p => p.status !== ProjectStatus.COMPLETADO_PAGADO && p.status !== ProjectStatus.CREADO);
  
  // Financial stats
  let totalApprovedInvestment = 0;
  let totalReleasedFunds = 0;

  projects.forEach(p => {
    // Investment approved
    if (p.approvedInvestmentAmount) {
      totalApprovedInvestment += p.approvedInvestmentAmount;
    } else {
      totalApprovedInvestment += p.estimatedTotal;
    }

    // Funds released
    if (p.advancePaidAmount) totalReleasedFunds += p.advancePaidAmount;
    if (p.finalPaidAmount) totalReleasedFunds += p.finalPaidAmount;
  });

  const pendingFunds = Math.max(0, totalApprovedInvestment - totalReleasedFunds);

  // Filter projects for the table
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // SVG Chart: Type breakdown
  const infraCount = projects.filter(p => p.type === "INFRAESTRUCTURA").length;
  const mantCount = projects.filter(p => p.type === "MANTENIMIENTO").length;
  const totalTypeCount = infraCount + mantCount || 1;
  const infraPercent = Math.round((infraCount / totalTypeCount) * 100);
  const mantPercent = Math.round((mantCount / totalTypeCount) * 100);

  const STATUS_LABEL_MAP: Record<string, string> = {
    [ProjectStatus.CREADO]: "Enviado a Cierre de Obra",
    [ProjectStatus.REVISADO_CIERRE]: "Revisado - Para Procura",
    [ProjectStatus.CONFIRMADO_PROCURA]: "Confirmado - En Licitación",
    [ProjectStatus.COMPARATIVA_ENVIADA]: "Comparativa Lista",
    [ProjectStatus.CONTRATADO]: "Pendiente Anticipo Finanzas",
    [ProjectStatus.EN_EJECUCION]: "Obra en Ejecución",
    [ProjectStatus.VERIFICANDO_FINALIZACION]: "Cerrando Obra (Auditoría)",
    [ProjectStatus.LISTO_PAGO_FINAL]: "Pendiente Finiquito",
    [ProjectStatus.COMPLETADO_PAGADO]: "Completado y Liquidado",
  };

  const getStatusBadge = (status: ProjectStatus) => (
    <StatusBadge code={status} label={STATUS_LABEL_MAP[status]} />
  );

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">Presupuesto Aprobado</span>
            <DollarSign className="h-5 w-5 text-sky-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-white">
              ${totalApprovedInvestment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Inversión autorizada en Base de Datos</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-600">Fondos Liquidados</span>
            <CheckCircle2 className="h-5 w-5 text-sky-600" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-slate-900">
              ${totalReleasedFunds.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-sky-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (totalReleasedFunds / (totalApprovedInvestment || 1)) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {Math.round((totalReleasedFunds / (totalApprovedInvestment || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-500">Compromisos Pendientes</span>
            <Clock className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-slate-900">
              ${pendingFunds.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Fondos retenidos por ejecutar o pagar</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-600">Estado de Proyectos</span>
            <Layers className="h-5 w-5 text-sky-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-black font-mono text-slate-900">{totalProjectsCount}</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Totales</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> {activeProjects.length} Activos
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {completedProjects.length} Pagados
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <h4 className="font-sans font-bold text-slate-400 text-[10px] mb-5 uppercase tracking-wider font-mono">
          Distribución por Tipo de Obra
        </h4>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <div className="relative flex items-center justify-center">
              <svg width="160" height="160" className="transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="transparent"
                  stroke="#0ea5e9"
                  strokeWidth="16"
                  strokeDasharray={`${2 * Math.PI * 60}`}
                  strokeDashoffset={`${2 * Math.PI * 60 * (1 - infraPercent / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-800 font-mono">{infraCount}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase font-sans">Infraestructura</span>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-4 w-full border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <span className="w-3 h-3 rounded bg-sky-500 flex-shrink-0"></span>
                <span className="text-xs text-slate-600 font-bold">Infraestructura</span>
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className="bg-sky-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${infraPercent}%` }}></div>
              </div>
              <span className="text-xs font-mono font-black text-slate-800 whitespace-nowrap w-20 text-right">{infraCount} ({infraPercent}%)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <span className="w-3 h-3 rounded bg-slate-300 flex-shrink-0"></span>
                <span className="text-xs text-slate-600 font-bold">Mantenimiento</span>
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className="bg-slate-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${mantPercent}%` }}></div>
              </div>
              <span className="text-xs font-mono font-black text-slate-800 whitespace-nowrap w-20 text-right">{mantCount} ({mantPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
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
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">EN VIVO</span>
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold border border-slate-200">
              {auditLogs.length} registros
            </span>
          </div>
        </div>
        <Table
          columns={[
            { key: "timestamp", label: "Timestamp", render: (log) => <span className="text-[10px] font-mono text-slate-400 font-semibold whitespace-nowrap">{log.timestamp}</span> },
            { key: "role", label: "Rol", render: (log) => <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg border ${getRoleColor(log.role)}`}>{log.role}</span> },
            { key: "userName", label: "Usuario", render: (log) => log.userName ? <span className="text-xs font-semibold text-slate-700">{log.userName}</span> : <span className="text-[10px] text-slate-300 italic font-mono">—</span> },
            { key: "action", label: "Acción", render: (log) => <span className="text-xs font-bold text-slate-800">{log.action}</span> },
            { key: "projectTitle", label: "Proyecto", render: (log) => <span className="text-xs font-medium text-slate-700 line-clamp-1 max-w-[200px] block">{log.projectTitle}</span> },
            { key: "projectId", label: "Ref. ID", render: (log) => <span className="text-[10px] text-sky-600 font-bold font-mono whitespace-nowrap">{log.projectId}</span> },
            { key: "details", label: "Detalles", render: (log) => <span className="text-xs text-slate-500 font-medium line-clamp-2 max-w-xs block">{log.details || `Operación sobre: ${log.projectTitle}`}</span> },
          ]}
          data={auditLogs}
          rowKey={(log) => log.id}
          emptyMessage="No hay logs registrados todavía."
          maxHeight="350px"
          stickyHeader
          containerClassName="border border-slate-100 rounded-lg"
          rowHoverClass="hover:bg-sky-50/30"
          pageSize={25}
        />
      </div>

      {/* Master Database Table view */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
        
        {/* Table Filters header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-base">Master de Obras e Infraestructuras</h3>
            <p className="text-xs text-slate-500 font-medium">Visualización integrada de presupuestos, materiales, contratistas asignados y flujos.</p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="db-search"
                type="text"
                placeholder="Buscar por obra o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3.5 py-2.5 w-full text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold text-slate-700"
              />
            </div>

            {/* Type filter */}
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

            {/* Status filter */}
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden font-bold cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              {Object.values(ProjectStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table
          columns={[
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
            { key: "status", label: "Estado del Flujo", render: (p) => getStatusBadge(p.status) },
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
          ]}
          data={filteredProjects}
          rowKey={(p) => p.id}
          emptyMessage="No se encontraron obras con los filtros aplicados."
          maxHeight="350px"
          containerClassName="border border-slate-100 rounded-lg"
          pageSize={15}
        />
              
      </div>

    </div>
  );
}

/* ─── Skeleton Loader ─── */
function PresidenciaSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatsDark />
        <SkeletonStats />
        <SkeletonStats />
        <SkeletonStats />
      </div>

      {/* Chart card */}
      <SkeletonCard />

      {/* Audit table */}
      <SkeletonTable rows={4} columns={7} />

      {/* Projects table */}
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}
