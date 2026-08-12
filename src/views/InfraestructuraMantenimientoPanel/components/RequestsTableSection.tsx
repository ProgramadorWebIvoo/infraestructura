/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla de peticiones del departamento de Infraestructura / Mantenimiento:
 * búsqueda, filtro por etapa (compartido con el pipeline) y consulta del
 * expediente desde la fila. Sustituye la antigua lista de tarjetas
 * (engorrosa para consultar).
 */

import { useMemo, useState } from "react";
import { Eye, FilePlus2, SearchX } from "lucide-react";
import type { Project } from "../../../types";
import Card from "../../../components/UI/Card";
import InspectRequestModal from "../../../components/Modals/InspectRequestModal";
import StatusBadge from "../../../components/UI/StatusBadge";
import EmptyState from "../../../components/UI/EmptyState";
import { SearchInput } from "../../../components/UI/FilterBar";
import { Table, type Column } from "../../../components/UI/Table";
import { formatCurrency } from "../../../utils";
import { filterByStage } from "../pipeline";
import PipelineOverview from "./PipelineOverview";

interface RequestsTableSectionProps {
  projects: Project[];
  stageKey: string;
  onStageKeyChange: (key: string) => void;
}

function TypeBadge({ type }: { type: Project["type"] }) {
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${
      type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
    }`}>
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

export default function RequestsTableSection({ projects, stageKey, onStageKeyChange }: RequestsTableSectionProps) {
  const [query, setQuery] = useState("");
  const [inspectedRequest, setInspectedRequest] = useState<Project | null>(null);

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filterByStage(projects, stageKey)
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q),
      )
      .slice()
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || "") || a.id.localeCompare(b.id));
  }, [projects, stageKey, query]);

  const columns: Column<Project>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-[10px] text-sky-600 whitespace-nowrap">{p.id}</span>,
    },
    {
      key: "title",
      label: "Título / Ubicación",
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{p.title}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate">{p.location}</div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      width: "5.5rem",
      sortable: true,
      render: (p) => <TypeBadge type={p.type} />,
    },
    {
      key: "status",
      label: "Estado",
      width: "8rem",
      sortable: true,
      render: (p) => <StatusBadge code={p.status} />,
    },
    {
      key: "createdDate",
      label: "Fecha",
      width: "7rem",
      sortable: true,
      render: (p) => <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{p.createdDate}</span>,
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "7.5rem",
      align: "right",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-slate-800 whitespace-nowrap">{formatCurrency(p.estimatedTotal)}</span>,
    },
    {
      key: "actions",
      label: "",
      width: "3.5rem",
      align: "center",
      sortable: false,
      render: (p) => (
        <button
          id={`btn-inspect-request-${p.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInspectedRequest(p);
          }}
          aria-label={`Inspeccionar ${p.title}`}
          className="inline-flex items-center justify-center p-1.5 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 border border-transparent hover:border-sky-100 transition-colors cursor-pointer"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <Card className="border-l-4 border-l-slate-400">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="p-2 bg-slate-100 rounded-xl">
          <FilePlus2 className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Peticiones del Departamento</h4>
          <p className="text-[10px] text-slate-400 font-medium">{visibleProjects.length} de {projects.length} registradas</p>
        </div>
        <div className="ml-auto w-full sm:w-64">
          <SearchInput
            id="req-search"
            value={query}
            onChange={setQuery}
            placeholder="Buscar por título, ID o ubicación..."
            ariaLabel="Buscar peticiones"
          />
        </div>
      </div>

      <PipelineOverview projects={projects} stageKey={stageKey} onStageKeyChange={onStageKeyChange} />

      <Table
        columns={columns}
        data={visibleProjects}
        rowKey={(p) => p.id}
        pageSize={6}
        onRowClick={(p) => setInspectedRequest(p)}
        emptyState={
          <EmptyState
            message={projects.length === 0 ? "No hay peticiones registradas aún." : "No hay peticiones que coincidan con la búsqueda o el filtro."}
            icon={<SearchX className="h-8 w-8" />}
          />
        }
      />

      <InspectRequestModal
        isOpen={!!inspectedRequest}
        project={inspectedRequest}
        onClose={() => setInspectedRequest(null)}
      />
    </Card>
  );
}
