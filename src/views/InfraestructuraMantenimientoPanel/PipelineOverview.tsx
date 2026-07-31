/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pipeline del departamento de Infraestructura / Mantenimiento: tira de chips
 * con el conteo de peticiones por etapa canónica del flujo. Integrada en la
 * tarjeta de peticiones, filtra la tabla (estado controlado por el padre).
 */

import { useMemo } from "react";
import type { Project } from "../../types";
import { PIPELINE_STAGES, countByStage } from "./pipeline";

interface PipelineOverviewProps {
  projects: Project[];
  stageKey: string;
  onStageKeyChange: (key: string) => void;
}

const chipClass = (active: boolean, activeCls: string) =>
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
    active ? activeCls : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
  }`;

export default function PipelineOverview({ projects, stageKey, onStageKeyChange }: PipelineOverviewProps) {
  const counts = useMemo(() => countByStage(projects), [projects]);

  return (
    <div
      role="group"
      aria-label="Filtrar por etapa del flujo"
      className="flex items-center gap-2 overflow-x-auto pb-1.5 mb-4 -mx-1 px-1 scroll-smooth"
    >
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Flujo:</span>

      <button
        type="button"
        onClick={() => onStageKeyChange("todas")}
        aria-pressed={stageKey === "todas"}
        className={chipClass(stageKey === "todas", "border-slate-800 bg-slate-800 text-white shadow-sm shadow-slate-900/20")}
      >
        Todas
        <span className="font-mono font-black">{projects.length}</span>
      </button>

      {PIPELINE_STAGES.map((stage) => {
        const Icon = stage.icon;
        const count = counts[stage.key] ?? 0;
        const active = stageKey === stage.key;
        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onStageKeyChange(active ? "todas" : stage.key)}
            aria-pressed={active}
            className={chipClass(active, stage.active)}
          >
            <Icon className="h-3.5 w-3.5" />
            {stage.label}
            <span className={`font-mono font-black ${count > 0 ? "" : "opacity-50"}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
