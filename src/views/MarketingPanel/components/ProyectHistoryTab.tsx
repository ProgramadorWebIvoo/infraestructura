/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Historial de Proyectos" de Marketing — mismo listado que ProyectTab
 * (Card + TableToolbar + Table/GridView, vía MarketingProjectsTableView),
 * pero con columnas orientadas a auditoría: quién revisó, cuándo, y el
 * motivo si fue rechazado, en vez de las columnas operativas (prioridad,
 * costo) de la tab "Proyectos".
 */

import { useMemo } from "react";
import { CalendarRange, Eye, History, MapPin, UserCheck } from "lucide-react";
import StatusBadge from "@/components/UI/StatusBadge";
import IconActionButton from "@/components/UI/IconActionButton";
import { type Column } from "@/components/UI/Table";
import MarketingProjectsTableView from "./MarketingProjectsTableView";
import { renderMarketingHistoryCard } from "./ProyectGridCard";
import { MARKETING_TYPE_LABELS, type MarketingProject } from "../types";

interface ProyectHistoryTabProps {
  projects: MarketingProject[];
  isLoading?: boolean;
  /** Abre el detalle de la propuesta (modal/drawer) — a definir por el consumidor. */
  onView?: (project: MarketingProject) => void;
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_REVISION", label: "En Revisión" },
  { value: "APROBADO", label: "Aprobado" },
  { value: "RECHAZADO", label: "Rechazado" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProyectHistoryTab({ projects, isLoading = false, onView }: ProyectHistoryTabProps) {
  const columns: Column<MarketingProject>[] = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        width: "6.5rem",
        sortable: true,
        render: (p) => <span className="font-mono font-bold text-[10px] text-brand-600 whitespace-nowrap">{p.id}</span>,
      },
      {
        key: "title",
        label: "Título / Sede",
        sortable: true,
        render: (p) => (
          <div className="min-w-0">
            <div className="font-bold text-slate-800 truncate">{p.title}</div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {p.location}
            </div>
          </div>
        ),
      },
      {
        key: "type",
        label: "Tipo",
        width: "7rem",
        sortable: true,
        render: (p) => (
          <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
            {MARKETING_TYPE_LABELS[p.type]}
          </span>
        ),
      },
      {
        key: "status",
        label: "Estado",
        width: "8rem",
        sortable: true,
        render: (p) => <StatusBadge code={p.status} />,
      },
      {
        key: "requestedByName",
        label: "Solicitado por",
        width: "9rem",
        render: (p) => <span className="text-xs text-slate-600 truncate block">{p.requestedByName ?? "—"}</span>,
      },
      {
        key: "createdAt",
        label: "Fecha Creación",
        width: "7.5rem",
        sortable: true,
        render: (p) => (
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500 whitespace-nowrap">
            <CalendarRange className="h-3 w-3" />
            {formatDate(p.createdAt)}
          </span>
        ),
      },
      {
        key: "reviewedByName",
        label: "Revisado por",
        width: "9rem",
        render: (p) =>
          p.reviewedByName ? (
            <span className="flex items-center gap-1 text-xs text-slate-600 truncate">
              <UserCheck className="h-3 w-3 shrink-0 text-slate-400" />
              {p.reviewedByName}
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          ),
      },
      {
        key: "reviewedAt",
        label: "Fecha Revisión",
        width: "7.5rem",
        sortable: true,
        render: (p) => <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{formatDate(p.reviewedAt)}</span>,
      },
      {
        key: "rejectionReason",
        label: "Motivo de Rechazo",
        render: (p) =>
          p.status === "RECHAZADO" && p.rejectionReason ? (
            <span className="text-xs text-red-600 font-medium line-clamp-2">{p.rejectionReason}</span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          ),
      },
      {
        key: "actions",
        label: "",
        width: "3.5rem",
        align: "right",
        render: (p) => (
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label="Ver detalle"
            tooltip="Ver detalle"
            tone="sky"
            onClick={() => onView?.(p)}
          />
        ),
      },
    ],
    [onView],
  );

  return (
    <MarketingProjectsTableView
      projects={projects}
      isLoading={isLoading}
      onView={onView}
      icon={<History className="h-5 w-5" />}
      title="Historial de Proyectos"
      description="Registro completo de propuestas de Marketing con su trazabilidad de revisión y aprobación."
      color="slate"
      columns={columns}
      renderCard={renderMarketingHistoryCard}
      searchId="marketing-history-search"
      searchPlaceholder="Buscar por título, ID o sede..."
      searchAriaLabel="Buscar en el historial de marketing"
      statusFilterId="marketing-history-status-filter"
      statusFilterOptions={STATUS_FILTER_OPTIONS}
      emptyMessage="No hay registros en el historial que coincidan con la búsqueda."
      noun="registro"
      nounPlural="registros"
      defaultViewMode="table"
    />
  );
}
