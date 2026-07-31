/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección del master de obras — extraída de PresidenciaDashboard.
 * Incluye avance financiero por obra, contratista adjudicado, variación
 * estimado vs contrato, antigüedad y exportación CSV de los filtros activos.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Download, FileSpreadsheet, FileText, Layers, MapPin, Star } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import StatusBadge from "../../components/UI/StatusBadge";
import EmptyState from "../../components/UI/EmptyState";
import ExportButton, { type ExportRow } from "../../components/UI/ExportButton";
import { SearchInput, SelectFilter } from "../../components/UI/FilterBar";
import { Table, type Column } from "../../components/UI/Table";
import { daysBetween, approvedOf, releasedOf, winnerOf } from "../../utils/dashboardSummary";
import { itemVariants } from "../../animations";

const fmtMoney = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AdvanceBar({ project }: { project: Project }) {
  const approved = approvedOf(project);
  const paid = releasedOf(project);
  const pct = approved > 0 ? Math.min(100, Math.round((paid / approved) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${
            pct >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-sky-400 to-sky-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold text-slate-600 whitespace-nowrap">{pct}%</span>
    </div>
  );
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
            {p.type} • hace {daysBetween(p.createdDate)}d
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
    { key: "estimatedTotal", label: "Estimado Materiales", render: (p) => <span className="font-mono font-bold text-slate-700">${fmtMoney(p.estimatedTotal)}</span> },
    {
      key: "finalContractValue",
      label: "Contrato Final",
      render: (p) => {
        const winner = winnerOf(p);
        if (!winner) return <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider italic">Sin contratar</span>;
        const variance = p.estimatedTotal > 0 ? ((winner.totalCost - p.estimatedTotal) / p.estimatedTotal) * 100 : 0;
        return (
          <div>
            <div className="font-mono font-black text-slate-900">${fmtMoney(winner.totalCost)}</div>
            {p.estimatedTotal > 0 && (
              <div className={`text-[10px] font-mono font-bold ${variance >= 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {variance >= 0 ? "+" : ""}{variance.toFixed(1)}% vs estimado
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "advance",
      label: "Avance Financiero",
      render: (p) => <AdvanceBar project={p} />,
    },
    {
      key: "contractor",
      label: "Contratista",
      render: (p) => {
        const winner = winnerOf(p);
        if (!winner) return <span className="text-slate-300 italic font-mono text-[10px]">—</span>;
        return (
          <div className="min-w-[120px]">
            <div className="text-xs font-bold text-slate-700 line-clamp-1">{winner.contractorName}</div>
            {winner.contractorRating != null && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {winner.contractorRating.toFixed(1)}
              </div>
            )}
          </div>
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

interface MasterTableSectionProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

const TYPE_OPTIONS = [
  { value: "ALL", label: "Todos los Tipos" },
  { value: "INFRAESTRUCTURA", label: "Infraestructura" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
];

function buildStatusOptions(): { value: string; label: string }[] {
  return [
    { value: "ALL", label: "Todos los Estados" },
    ...Object.values(ProjectStatus).map((status) => ({ value: status, label: status })),
  ];
}

const EXPORT_HEADERS = [
  "id", "title", "type", "location", "status", "createdDate",
  "estimatedTotal", "approvedInvestmentAmount", "contractValue", "paidAmount",
  "contractorName", "contractorRating",
];

export default function MasterTableSection({ projects, onSelectProject }: MasterTableSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const projectColumns = useMemo(() => getProjectColumns(onSelectProject), [onSelectProject]);
  const statusOptions = useMemo(() => buildStatusOptions(), []);

  const filteredProjects = useMemo(() => projects.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      p.title.toLowerCase().includes(term) ||
      p.location.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }), [projects, searchTerm, statusFilter, typeFilter]);

  const exportRows = useMemo<ExportRow[]>(
    () =>
      filteredProjects.map((p) => {
        const winner = winnerOf(p);
        return [
          p.id, p.title, p.type, p.location, p.status, p.createdDate,
          p.estimatedTotal, p.approvedInvestmentAmount ?? "", winner?.totalCost ?? "",
          releasedOf(p), winner?.contractorName ?? "", winner?.contractorRating ?? "",
        ];
      }),
    [filteredProjects]
  );

  const exportProps = {
    filename: `master-obras-${new Date().toISOString().slice(0, 10)}`,
    headers: EXPORT_HEADERS,
    rows: exportRows,
    title: "Master de Obras e Infraestructuras",
    subtitle: `Generado el ${new Date().toLocaleString("es-ES", { dateStyle: "long" })}`,
    disabled: filteredProjects.length === 0,
  };

  return (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
              <Layers className="h-4 w-4 text-sky-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Master de Obras e Infraestructuras</h2>
              <p className="text-[11px] text-slate-500 font-medium">Visualización integrada de presupuestos, materiales, contratistas asignados y flujos.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              format="csv"
              {...exportProps}
              icon={<Download className="h-3.5 w-3.5" />}
              aria-label="Exportar master a CSV"
              className="px-3 py-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100"
            >
              Exportar CSV
            </ExportButton>
            <ExportButton
              format="excel"
              {...exportProps}
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              aria-label="Exportar master a Excel"
              className="px-3 py-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100"
            >
              Exportar Excel
            </ExportButton>
            <ExportButton
              format="pdf"
              {...exportProps}
              icon={<FileText className="h-3.5 w-3.5" />}
              aria-label="Exportar master a PDF"
              className="px-3 py-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100"
            >
              Exportar PDF
            </ExportButton>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 mt-4">
          <SearchInput
            id="db-search"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por obra o código..."
            ariaLabel="Buscar obras"
          />
          <SelectFilter
            id="filter-type"
            value={typeFilter}
            onChange={setTypeFilter}
            ariaLabel="Filtrar por tipo"
            options={TYPE_OPTIONS}
          />
          <SelectFilter
            id="filter-status"
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filtrar por estado"
            options={statusOptions}
          />
        </div>
      </div>
      <Table
        columns={projectColumns}
        data={filteredProjects}
        rowKey={(p) => p.id}
        emptyMessage="No se encontraron obras con los filtros aplicados."
        emptyState={<EmptyState message="No se encontraron obras con los filtros aplicados." />}
        maxHeight="350px"
        containerClassName="border border-slate-100 rounded-lg"
        pageSize={15}
      />
    </motion.div>
  );
}
