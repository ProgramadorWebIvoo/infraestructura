/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Módulo del ingeniero residente ("Mis obras"): carga su propio informe de campo,
 * independiente del contratista (Auditoría compara). Sin datos financieros (los
 * endpoints los omiten). Búsqueda, filtro por estado del informe y tabla paginada
 * para que siga usable con muchas obras.
 */

import { useMemo, useState } from "react";
import { HardHat } from "lucide-react";
import Button from "@/components/UI/Button";
import Card from "@/components/UI/Card";
import EmptyState from "@/components/UI/EmptyState";
import SectionHeader from "@/components/UI/SectionHeader";
import StatusBadge from "@/components/UI/StatusBadge";
import TableToolbar from "@/components/UI/TableToolbar";
import { Table, type Column } from "@/components/UI/Table";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "@/components/UI/colorTokens";
import { useResidentProjects, type ResidentProject } from "@/hooks/useResidentProjects";
import { filterResidentProjects, reportState, sortPendingFirst, type ResidentReportFilter, type ResidentReportState } from "./residentRules";
import ResidentProjectModal from "./ResidentProjectModal";

interface ResidentePanelProps {
  authToken: string;
}

const PAGE_SIZE = 10;

const REPORT_STATE_UI: Record<ResidentReportState, { label: string; color: SemanticColor }> = {
  PENDIENTE: { label: "Por cargar", color: "warning" },
  DEVUELTO: { label: "Devuelto por Auditoría", color: "danger" },
  ENVIADO: { label: "Enviado", color: "success" },
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "Todos los informes" },
  { value: "PENDIENTE", label: "Por cargar" },
  { value: "DEVUELTO", label: "Devueltos por Auditoría" },
  { value: "ENVIADO", label: "Enviados" },
];

export default function ResidentePanel({ authToken }: ResidentePanelProps) {
  const { projects, isLoading, reload, approve, uploadPhoto, deletePhoto, loadDocuments } = useResidentProjects(authToken);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ResidentReportFilter>("ALL");

  const sorted = useMemo(() => sortPendingFirst(projects), [projects]);
  const visible = useMemo(() => filterResidentProjects(sorted, query, filter), [sorted, query, filter]);
  const selected = projects.find((p) => p.id === openId) ?? null;
  const pending = sorted.filter((p) => p.pendingAction).length;

  const columns: Column<ResidentProject>[] = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        width: "6.5rem",
        sortable: true,
        render: (p) => <span className="whitespace-nowrap font-mono text-[10px] font-bold text-text-secondary">{p.id}</span>,
      },
      {
        key: "title",
        label: "Obra / Ubicación",
        sortable: true,
        render: (p) => (
          <div className="min-w-0">
            <div className="truncate font-bold text-text-primary">{p.title}</div>
            <div className="truncate text-[11px] text-text-secondary">{p.location}</div>
          </div>
        ),
      },
      {
        key: "status",
        label: "Estado de la obra",
        width: "11rem",
        sortable: true,
        render: (p) => <StatusBadge code={p.status} />,
      },
      {
        key: "report",
        label: "Mi informe",
        width: "11rem",
        sortable: true,
        sortValue: (p) => reportState(p),
        render: (p) => {
          const { label, color } = REPORT_STATE_UI[reportState(p)];
          const map = SEMANTIC_COLOR_MAP[color];
          return (
            <span className={`whitespace-nowrap rounded-pill border px-2 py-0.5 text-[10px] font-bold ${map.bg50} ${map.border200} ${map.text700}`}>{label}</span>
          );
        },
      },
      {
        key: "action",
        label: "",
        width: "10rem",
        align: "right",
        render: (p) => (
          <Button
            size="sm"
            colorScheme="sky"
            variant={p.pendingAction ? "primary" : "secondary"}
            onClick={(event) => {
              event.stopPropagation();
              setOpenId(p.id);
            }}
          >
            {p.pendingAction ? "Cargar mi informe" : "Ver mi informe"}
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        icon={<HardHat className="h-5 w-5" />}
        title="Mis obras"
        description={pending > 0 ? `${pending} obra(s) pendiente(s) de su informe de campo` : "Obras a su cargo: cargue su informe de verificación en campo"}
        color="sky"
      />

      {!isLoading && sorted.length === 0 ? (
        <EmptyState message="No tiene obras asignadas por el momento." icon={<HardHat className="h-8 w-8" />} />
      ) : (
        <Card accent="brand" className="overflow-hidden p-0">
          <TableToolbar
            searchId="resident-projects-search"
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Buscar por título, ID o ubicación..."
            searchAriaLabel="Buscar en mis obras"
            filter={{ id: "resident-projects-filter", value: filter, onChange: (v) => setFilter(v as ResidentReportFilter), ariaLabel: "Filtrar por estado del informe", options: FILTER_OPTIONS }}
            countIcon={<HardHat />}
            filteredCount={visible.length}
            totalCount={sorted.length}
            noun="obra"
            nounPlural="obras"
            onRefresh={reload}
          />
          <div className="px-6 pb-6 pt-4">
            <Table
              columns={columns}
              data={visible}
              rowKey={(p) => p.id}
              isLoading={isLoading}
              pageSize={PAGE_SIZE}
              stickyHeader
              onRowClick={(p) => setOpenId(p.id)}
              selectedRowKey={openId ?? undefined}
              emptyState={<EmptyState message="Ninguna obra coincide con la búsqueda o el filtro." />}
            />
          </div>
        </Card>
      )}

      <ResidentProjectModal project={selected} authToken={authToken} actions={{ approve, uploadPhoto, deletePhoto, loadDocuments }} onClose={() => setOpenId(null)} />
    </div>
  );
}
