/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Flujo de decisiones (Organigrama IVOO) con avance por rol — extraído de
 * InspectProjectModal.tsx (división por SRP: cada sección del modal es
 * visual y lógicamente independiente de las otras dos).
 */

import { CheckCircle2, Circle, Clock, Database } from "lucide-react";
import type { Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import { ROLE_STYLES, type RoleId } from "./roleStyles";

type NodeState = "done" | "current" | "partial" | "pending";

const NODE_STATE_CLASSES: Record<NodeState, string> = {
  done: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  current: "text-white shadow-md scale-[1.02]",
  partial: "border-amber-200 bg-amber-50/80 text-amber-800",
  pending: "border-slate-200 bg-white text-slate-400",
};

const NODE_STATE_LABELS: Record<NodeState, string> = {
  done: "Hecho",
  current: "En curso",
  partial: "Parcial",
  pending: "Pendiente",
};

/** Rol que tiene la "pelota" según el estado del proyecto (null = en ejecución/terminado). */
function currentRoleOf(status: ProjectStatus): RoleId | null {
  switch (status) {
    case ProjectStatus.CREADO:
    case ProjectStatus.VERIFICANDO_FINALIZACION:
      return "CIERRE_DE_OBRA";
    case ProjectStatus.REVISADO_CIERRE:
    case ProjectStatus.COMPARATIVA_ENVIADA:
      return "PROCURA";
    case ProjectStatus.CONFIRMADO_PROCURA:
      return "ANALISTA";
    case ProjectStatus.CONTRATADO:
    case ProjectStatus.LISTO_PAGO_FINAL:
      return "FINANZAS";
    default:
      return null;
  }
}

/** Estado del nodo del organigrama según el avance real del proyecto. */
function getNodeState(project: Project, role: RoleId): NodeState {
  const isCurrent = currentRoleOf(project.status) === role;
  switch (role) {
    case "PRESIDENCIA":
      return "done"; // supervisión transversal, siempre en alcance
    case "CIERRE_DE_OBRA": {
      if (isCurrent) return "current";
      if (project.qualityVerified) return "done";
      if (project.cierreObraNotes) return "partial";
      return "pending";
    }
    case "PROCURA": {
      if (isCurrent) return "current";
      if (project.selectedContractorCode) return "done";
      if (project.approvedInvestmentAmount) return "partial";
      return "pending";
    }
    case "ANALISTA": {
      if (isCurrent) return "current";
      if ((project.proposals?.length ?? 0) > 0) return "done";
      return "pending";
    }
    case "FINANZAS": {
      if (isCurrent) return "current";
      if (project.finalPaidAmount) return "done";
      if (project.advancePaidAmount) return "partial";
      return "pending";
    }
    default:
      return "pending";
  }
}

function NodeStateChip({ state }: { state: NodeState }) {
  const icon =
    state === "done" ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : state === "current" ? (
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
    ) : state === "partial" ? (
      <Clock className="h-3 w-3" />
    ) : (
      <Circle className="h-3 w-3" />
    );

  return (
    <span
      className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wide border ${NODE_STATE_CLASSES[state]}`}
    >
      {icon}
      {NODE_STATE_LABELS[state]}
    </span>
  );
}

interface OrgNodeProps {
  role: RoleId;
  code: string;
  label: string;
  state: NodeState;
}

function OrgNode({ role, code, label, state }: OrgNodeProps) {
  const style = ROLE_STYLES[role];
  const border = state === "current" ? style.solid : state === "pending" ? "border-slate-200" : NODE_STATE_CLASSES[state].split(" ")[0];
  const text = state === "current" ? "text-white" : state === "pending" ? "text-slate-400" : style.text;
  const codeText = state === "current" ? "text-white/90" : style.accent;

  return (
    <div className={`w-full max-w-[130px] p-2.5 rounded-xl border text-center transition-all duration-300 ${border}`}>
      <div className={`font-mono text-[9px] font-bold tracking-wide ${codeText}`}>{code}</div>
      <div className={`text-[10px] font-medium mt-0.5 ${text}`}>{label}</div>
      <NodeStateChip state={state} />
    </div>
  );
}

export default function ProjectOrganigrama({ project }: { project: Project }) {
  const stateOf = (role: RoleId) => getNodeState(project, role);

  return (
    <section aria-label="Flujo de decisiones — Organigrama IVOO">
      <div className="flex flex-col items-center gap-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-100 overflow-x-auto min-w-[320px]">
        {/* Presidencia */}
        <OrgNode role="PRESIDENCIA" code="PRESIDENCIA" label="Supervisión en Tiempo Real" state={stateOf("PRESIDENCIA")} />
        <div className="h-3 w-0.5 bg-slate-300" />

        {/* Base de datos (núcleo centralizador) */}
        <div className="w-48 p-2.5 rounded-xl border border-sky-100 bg-sky-50 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1.5 text-sky-800 font-bold text-[10px] tracking-wider font-mono">
            <Database className="h-3.5 w-3.5 text-sky-500" />
            BASE DE DATOS IVOO
          </div>
          <div className="text-[9px] text-sky-600 font-bold font-mono uppercase tracking-wide mt-0.5">Núcleo Centralizador</div>
        </div>

        {/* Conectores a departamentos */}
        <div className="w-full max-w-md flex items-center justify-between px-6 -mt-1">
          <div className="w-1/3 h-4 border-t-2 border-l-2 border-slate-300 rounded-tl-lg" />
          <div className="w-0.5 h-4 bg-gradient-to-b from-slate-300 to-slate-400" />
          <div className="w-1/3 h-4 border-t-2 border-r-2 border-slate-300 rounded-tr-lg" />
        </div>

        {/* 3 columnas: Cierre / Procura-Analistas / Finanzas */}
        <div className="w-full grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center">
            <OrgNode role="CIERRE_DE_OBRA" code="CIERRE DE OBRA" label="Revisión Técnica" state={stateOf("CIERRE_DE_OBRA")} />
            <div className="h-2.5 w-0.5 bg-slate-300" />
            <span className="text-[9px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 border border-slate-200 rounded-lg">Infraestructura</span>
          </div>
          <div className="flex flex-col items-center">
            <OrgNode role="PROCURA" code="GERENCIA PROCURA" label="Inversión" state={stateOf("PROCURA")} />
            <div className="h-2.5 w-0.5 bg-slate-300" />
            <OrgNode role="ANALISTA" code="ANALISTAS" label="Licitaciones" state={stateOf("ANALISTA")} />
          </div>
          <div className="flex flex-col items-center">
            <OrgNode role="FINANZAS" code="FINANZAS" label="Fondos" state={stateOf("FINANZAS")} />
            <div className="h-2.5 w-0.5 bg-slate-300" />
            <span className="text-[9px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 border border-slate-200 rounded-lg">Mantenimiento</span>
          </div>
        </div>
      </div>

      {/* Leyenda de estado */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] font-mono font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Hecho</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> En curso</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Parcial</span>
        <span className="inline-flex items-center gap-1"><Circle className="h-3 w-3 text-slate-400" /> Pendiente</span>
      </div>
    </section>
  );
}
