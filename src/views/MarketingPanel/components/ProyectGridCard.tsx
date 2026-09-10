/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en la tab "Proyectos" de Marketing —
 * GridView (src/components/UI/GridView) no conoce el dominio; este archivo
 * decide qué pintar dentro de cada tarjeta, vía `renderCard`. Mismo patrón
 * que InvestmentApprovalGridCard.tsx (Procura).
 */

import { CalendarRange, MapPin, Paperclip, UserCheck } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import StatusBadge from "@/components/UI/StatusBadge";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import {
  MARKETING_PRIORITY_ACCENT,
  MARKETING_PRIORITY_LABELS,
  MARKETING_TYPE_LABELS,
  type MarketingProject,
} from "../types";

function TypeBadge({ type }: { type: MarketingProject["type"] }) {
  return (
    <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
      {MARKETING_TYPE_LABELS[type]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: MarketingProject["priority"] }) {
  const c = SEMANTIC_COLOR_MAP[MARKETING_PRIORITY_ACCENT[priority]];
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-pill text-[10px] font-semibold border ${c.bg50} ${c.text700} ${c.border100}`}>
      {MARKETING_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function renderMarketingProjectCard(project: MarketingProject) {
  return (
    <div className="p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold text-brand-600">{project.id}</span>
        <TypeBadge type={project.type} />
      </div>

      <div className="text-xs font-bold text-slate-800 line-clamp-1">{project.title}</div>
      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0" />
        {project.location}
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge code={project.status} />
        <PriorityBadge priority={project.priority} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400">
          <CalendarRange className="h-3 w-3" />
          {new Date(project.createdAt).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </span>
        <div className="text-right">
          {project.estimatedCost != null && (
            <div className="font-mono font-bold text-brand-700">{formatCurrency(project.estimatedCost)}</div>
          )}
          {project.attachments.length > 0 && (
            <span className="flex items-center justify-end gap-0.5 text-[9px] font-semibold text-slate-400">
              <Paperclip className="h-2.5 w-2.5" />
              {project.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Variante de tarjeta para el tab "Historial de Proyectos" — mismo layout
 * base, pero cambia el pie de costo/adjuntos por el registro de auditoría
 * (quién revisó y cuándo, o el motivo si fue rechazado), que es lo
 * relevante en una vista de historial.
 */
export function renderMarketingHistoryCard(project: MarketingProject) {
  return (
    <div className="p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-bold text-brand-600">{project.id}</span>
        <TypeBadge type={project.type} />
      </div>

      <div className="text-xs font-bold text-slate-800 line-clamp-1">{project.title}</div>
      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0" />
        {project.location}
      </div>

      <StatusBadge code={project.status} />

      <div className="pt-2 border-t border-slate-100 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1 font-mono font-bold text-slate-400">
            <CalendarRange className="h-3 w-3" />
            {new Date(project.createdAt).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
          {project.reviewedByName && (
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              <UserCheck className="h-3 w-3" />
              {project.reviewedByName}
            </span>
          )}
        </div>
        {project.status === "RECHAZADO" && project.rejectionReason && (
          <p className="text-[10px] text-red-600 font-medium line-clamp-2">{project.rejectionReason}</p>
        )}
      </div>
    </div>
  );
}
