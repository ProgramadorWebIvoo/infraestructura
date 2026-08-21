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
import { Eye, ListChecks, SearchX } from "lucide-react";
import type { Project } from "../../../types";
import Card from "../../../components/UI/Card";
import InspectRequestModal from "../../../components/Modals/InspectRequestModal";
import StatusBadge from "../../../components/UI/StatusBadge";
import EmptyState from "../../../components/UI/EmptyState";
import TableToolbar from "../../../components/UI/TableToolbar";
import { Table, type Column } from "../../../components/UI/Table";
import { formatCurrency } from "../../../utils";
import { filterByStage } from "../pipeline";
import PipelineOverview from "./PipelineOverview";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";

interface RequestsTableSectionProps {
  projects: Project[];
  stageKey: string;
  onStageKeyChange: (key: string) => void;
}

function TypeBadge({ type }: { type: Project["type"] }) {
  const c = SEMANTIC_COLOR_MAP[type === "INFRAESTRUCTURA" ? "brand" : "neutral"];
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${c.bg50} ${c.text700} ${c.border100}`}>
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
    <Card hoverable={false} accent="neutral" fillHeight className="p-0 overflow-hidden">
      <TableToolbar
        searchId="req-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por título, ID o ubicación..."
        searchAriaLabel="Buscar peticiones"
        countIcon={<ListChecks />}
        filteredCount={visibleProjects.length}
        totalCount={projects.length}
        noun="petición"
        nounPlural="peticiones"
      />

      <div className="px-6 shrink-0">
        <PipelineOverview projects={projects} stageKey={stageKey} onStageKeyChange={onStageKeyChange} />
      </div>

      <div className="flex-1 min-h-0">
        <Table
          columns={columns}
          data={visibleProjects}
          rowKey={(p) => p.id}
          pageSize={6}
          fillViewport
          onRowClick={(p) => setInspectedRequest(p)}
          containerClassName="px-6 pb-6"
          emptyState={
            <EmptyState
              message={projects.length === 0 ? "No hay peticiones registradas aún." : "No hay peticiones que coincidan con la búsqueda o el filtro."}
              icon={<SearchX className="h-8 w-8" />}
            />
          }
        />
      </div>

      <InspectRequestModal
        isOpen={!!inspectedRequest}
        project={inspectedRequest}
        onClose={() => setInspectedRequest(null)}
      />
    </Card>
  );
}
