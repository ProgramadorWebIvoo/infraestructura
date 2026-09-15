/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido de tarjeta para GridView en Reevaluaciones de Procura (Cierre de
 * Obra) — mismo criterio que TechnicalReviewGridCard.tsx, con el motivo de
 * Procura en vez del conteo de insumos.
 */

import { memo } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import type { Project } from "@/types";

interface ReevaluationGridCardProps {
  project: Project;
  reason?: string;
}

function ReevaluationGridCard({ project, reason }: ReevaluationGridCardProps) {
  return (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[10px] text-warning-600 whitespace-nowrap">{project.id}</span>
        <span className="font-mono font-bold text-[11px] text-slate-800 whitespace-nowrap">{formatCurrency(project.estimatedTotal)}</span>
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{project.title}</div>
        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {project.location}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-500 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{reason ?? "Motivo no disponible."}</p>
      </div>
    </div>
  );
}

export default memo(ReevaluationGridCard);
