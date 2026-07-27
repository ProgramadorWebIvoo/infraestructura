/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección del master de obras — extraída de PresidenciaDashboard.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Layers, MapPin, Search } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import StatusBadge from "../../components/UI/StatusBadge";
import { Table, type Column } from "../../components/UI/Table";
import { itemVariants } from "../../animations";

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

interface MasterTableSectionProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export default function MasterTableSection({ projects, onSelectProject }: MasterTableSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const projectColumns = useMemo(() => getProjectColumns(onSelectProject), [onSelectProject]);

  const filteredProjects = useMemo(() => projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }), [projects, searchTerm, statusFilter, typeFilter]);

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
          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="db-search"
                type="text"
                placeholder="Buscar por obra o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar obras"
                className="pl-10 pr-3.5 py-2 w-full text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold text-slate-700"
              />
            </div>
            <select
              id="filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrar por tipo"
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
              aria-label="Filtrar por estado"
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
        columns={projectColumns}
        data={filteredProjects}
        rowKey={(p) => p.id}
        emptyMessage="No se encontraron obras con los filtros aplicados."
        maxHeight="350px"
        containerClassName="border border-slate-100 rounded-lg"
        pageSize={15}
      />
    </motion.div>
  );
}
