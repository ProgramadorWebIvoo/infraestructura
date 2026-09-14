/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tab "Proyectos" de Marketing — listado de piezas publicitarias
 * (impresiones, viniles, pendones, ...) con su estado de aprobación.
 * Puramente presentacional: recibe `projects` ya resueltos por el hook del
 * consumidor (useMarketingProjects, pendiente) y solo maneja estado de UI
 * (búsqueda, filtro, paginación vía Table).
 *
 * El chrome de listado (Card + SectionHeader + TableToolbar + Table/GridView
 * con toggle) vive en MarketingProjectsTableView — este archivo solo define
 * las columnas/tarjeta propias de "Proyectos". Ver ProyectHistoryTab.tsx
 * para el otro consumidor del mismo chrome.
 */

import { useMemo } from "react";
import { CalendarRange, Eye, ImageIcon, MapPin, Paperclip } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import StatusBadge from "@/components/UI/StatusBadge";
import IconActionButton from "@/components/UI/IconActionButton";
import { type Column } from "@/components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import MarketingProjectsTableView from "./MarketingProjectsTableView";
import { MarketingProjectGridCard } from "./ProyectGridCard";
import {
  MARKETING_PRIORITY_ACCENT,
  MARKETING_PRIORITY_LABELS,
  MARKETING_TYPE_LABELS,
  type MarketingProject,
} from "../types";

interface ProyectosTabProps {
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

function PriorityBadge({ priority }: { priority: MarketingProject["priority"] }) {
  const c = SEMANTIC_COLOR_MAP[MARKETING_PRIORITY_ACCENT[priority]];
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-pill text-xs font-semibold border ${c.bg50} ${c.text700} ${c.border100}`}>
      {MARKETING_PRIORITY_LABELS[priority]}
    </span>
  );
}

export default function ProyectosTab({ projects, isLoading = false, onView }: ProyectosTabProps) {
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
        key: "priority",
        label: "Prioridad",
        width: "6.5rem",
        sortable: true,
        render: (p) => <PriorityBadge priority={p.priority} />,
      },
      {
        key: "status",
        label: "Estado",
        width: "8rem",
        sortable: true,
        render: (p) => <StatusBadge code={p.status} />,
      },
      {
        key: "quantity",
        label: "Cant.",
        width: "4.5rem",
        align: "right",
        sortable: true,
        render: (p) => <span className="font-mono text-xs text-slate-600">{p.quantity ?? "—"}</span>,
      },
      {
        key: "estimatedCost",
        label: "Costo Est.",
        width: "7.5rem",
        align: "right",
        sortable: true,
        render: (p) => (
          <span className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
            {p.estimatedCost != null ? formatCurrency(p.estimatedCost) : "—"}
          </span>
        ),
      },
      {
        key: "requestedByName",
        label: "Solicitante",
        width: "9rem",
        render: (p) => <span className="text-xs text-slate-600 truncate block">{p.requestedByName ?? "—"}</span>,
      },
      {
        key: "createdAt",
        label: "Fecha",
        width: "6.5rem",
        sortable: true,
        render: (p) => (
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500 whitespace-nowrap">
            <CalendarRange className="h-3 w-3" />
            {new Date(p.createdAt).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        width: "6rem",
        align: "right",
        render: (p) => (
          <div className="flex items-center justify-end gap-1.5">
            {p.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-400" title={`${p.attachments.length} adjunto(s)`}>
                <Paperclip className="h-3 w-3" />
                {p.attachments.length}
              </span>
            )}
            <IconActionButton
              icon={<Eye className="h-4 w-4" />}
              label="Ver detalle"
              tooltip="Ver detalle"
              tone="sky"
              onClick={() => onView?.(p)}
            />
          </div>
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
      icon={<ImageIcon className="h-5 w-5" />}
      title="Proyectos de Marketing"
      description="Piezas publicitarias creadas por el equipo de Marketing y su estado de aprobación."
      color="amber"
      columns={columns}
      renderCard={(item) => <MarketingProjectGridCard project={item} />}
      searchId="marketing-projects-search"
      searchPlaceholder="Buscar por título, ID o sede..."
      searchAriaLabel="Buscar proyectos de marketing"
      statusFilterId="marketing-projects-status-filter"
      statusFilterOptions={STATUS_FILTER_OPTIONS}
      emptyMessage="No hay proyectos de marketing que coincidan con la búsqueda."
      noun="proyecto"
      nounPlural="proyectos"
    />
  );
}
