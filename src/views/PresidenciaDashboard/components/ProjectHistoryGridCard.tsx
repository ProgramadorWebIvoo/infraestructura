/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en el Histórico de Obras (Presidencia).
 */

import { memo } from "react";
import { AlertTriangle, Star } from "lucide-react";
import StatusBadge from "@/components/UI/StatusBadge";
import { SEMAPHORE_COLORS } from "@/hooks/useBudgetSemaphore";
import type { ProjectHistoryRow } from "../projectHistoryTypes";
import { fmtMoney } from "./ProjectHistoryFigures";

interface ProjectHistoryGridCardProps {
  row: ProjectHistoryRow;
  semaphoreLevel: keyof typeof SEMAPHORE_COLORS | null;
}

const fig = (n: number | null, empty = "—") => (n === null ? empty : fmtMoney(n));

function ProjectHistoryGridCard({ row, semaphoreLevel }: ProjectHistoryGridCardProps) {
  const f = row.figures;
  const hasAlert = f.flags.awardedExceedsApproved || f.flags.executedExceedsAwarded || f.flags.executedExceedsApproved;
  const sem = semaphoreLevel ? SEMAPHORE_COLORS[semaphoreLevel] : null;

  return (
    <div className="p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[9px] font-mono font-bold text-text-tertiary">{row.id} · {row.createdDate ?? "—"}</span>
          <h4 className="text-xs font-bold text-text-primary line-clamp-1">{row.title}</h4>
          {row.location && <p className="text-[11px] text-text-tertiary line-clamp-1">{row.location}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasAlert && <AlertTriangle className="h-4 w-4 text-danger-600" aria-label="Con alertas de presupuesto" />}
          <StatusBadge code={row.status} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-text-primary line-clamp-1">
          {row.contractor ? (row.contractor.name ?? row.contractor.code) : <span className="text-text-tertiary">Sin contratar</span>}
        </span>
        {row.contractor?.rating != null && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 shrink-0">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />{row.contractor.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border-subtle pt-2.5 text-[11px]">
        <div><span className="block text-[9px] font-bold text-text-tertiary">Estimado</span><span className="font-mono font-bold">{fig(f.estimated)}</span></div>
        <div><span className="block text-[9px] font-bold text-text-tertiary">Aprobado</span><span className="font-mono font-bold">{fig(f.approved, "Sin aprobar")}</span></div>
        <div><span className="block text-[9px] font-bold text-text-tertiary">Adjudicado</span><span className="font-mono font-bold">{fig(f.awarded)}</span></div>
        <div>
          <span className="block text-[9px] font-bold text-text-tertiary">Ejecutado</span>
          <span className="font-mono font-bold">{fig(f.executed)}</span>
          {sem && f.executionPercent !== null && (
            <span className={`ml-1.5 inline-flex rounded-pill border px-1.5 py-0.5 text-[10px] font-bold ${sem.bg} ${sem.text}`}>
              {f.executionPercent.toLocaleString("en-US", { maximumFractionDigits: 1 })}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProjectHistoryGridCard);
