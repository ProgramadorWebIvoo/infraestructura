/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de proyecto — expediente completo de la obra:
 *  - Estado actual + metadata
 *  - Snapshot financiero (estimado, aprobado, contrato, anticipo, liquidación)
 *  - Flujo de decisiones (Organigrama IVOO) con avance por rol
 *  - Trazabilidad paso a paso del workflow (8 etapas, datos completos)
 */

import {
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Database,
  FileSearch,
  Landmark,
  MapPin,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import Modal from "../UI/Modal";
import EmptyState from "../UI/EmptyState";
import StatusBadge from "../UI/StatusBadge";
import { daysBetween, approvedOf, winnerOf } from "../../utils/dashboardSummary";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type StepState = "done" | "current" | "pending";
type NodeState = "done" | "current" | "partial" | "pending";
type RoleId = "PRESIDENCIA" | "CIERRE_DE_OBRA" | "PROCURA" | "ANALISTA" | "FINANZAS";

interface InspectProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtMoney = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/** Estado de cada etapa de la trazabilidad (misma semántica que el timeline original). */
function getStepState(project: Project, index: number): StepState {
  switch (index) {
    case 1:
      return "done";
    case 2:
      return project.cierreObraNotes
        ? "done"
        : project.status === ProjectStatus.CREADO
          ? "current"
          : "pending";
    case 3:
      return project.approvedInvestmentAmount
        ? "done"
        : project.status === ProjectStatus.REVISADO_CIERRE
          ? "current"
          : "pending";
    case 4:
      return (project.proposals?.length ?? 0) > 0
        ? "done"
        : project.status === ProjectStatus.CONFIRMADO_PROCURA
          ? "current"
          : "pending";
    case 5:
      return project.selectedContractorCode
        ? "done"
        : project.status === ProjectStatus.COMPARATIVA_ENVIADA
          ? "current"
          : "pending";
    case 6:
      return project.advancePaidAmount
        ? "done"
        : project.status === ProjectStatus.CONTRATADO
          ? "current"
          : "pending";
    case 7:
      return project.qualityVerified
        ? "done"
        : project.status === ProjectStatus.EN_EJECUCION || project.status === ProjectStatus.VERIFICANDO_FINALIZACION
          ? "current"
          : "pending";
    case 8:
      return project.finalPaidAmount
        ? "done"
        : project.status === ProjectStatus.LISTO_PAGO_FINAL
          ? "current"
          : "pending";
    default:
      return "pending";
  }
}

// ---------------------------------------------------------------------------
// Paletas de color por rol (clases literales para Tailwind JIT)
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<RoleId, { accent: string; soft: string; solid: string; text: string }> = {
  PRESIDENCIA: { accent: "text-amber-600", soft: "bg-amber-50/80 border-amber-200", solid: "bg-amber-600 border-amber-600", text: "text-amber-700" },
  CIERRE_DE_OBRA: { accent: "text-blue-600", soft: "bg-blue-50/80 border-blue-200", solid: "bg-blue-600 border-blue-600", text: "text-blue-700" },
  PROCURA: { accent: "text-purple-600", soft: "bg-purple-50/80 border-purple-200", solid: "bg-purple-600 border-purple-600", text: "text-purple-700" },
  ANALISTA: { accent: "text-emerald-600", soft: "bg-emerald-50/80 border-emerald-200", solid: "bg-emerald-600 border-emerald-600", text: "text-emerald-700" },
  FINANZAS: { accent: "text-rose-600", soft: "bg-rose-50/80 border-rose-200", solid: "bg-rose-600 border-rose-600", text: "text-rose-700" },
};

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

const STEP_STATE_LABELS: Record<StepState, string> = {
  done: "Completado",
  current: "En curso",
  pending: "Pendiente",
};

const STEP_COLORS: Record<number, { solid: string; text: string }> = {
  1: { solid: "bg-slate-900", text: "text-slate-900" },
  2: { solid: "bg-blue-600", text: "text-blue-700" },
  3: { solid: "bg-purple-600", text: "text-purple-700" },
  4: { solid: "bg-emerald-600", text: "text-emerald-700" },
  5: { solid: "bg-indigo-600", text: "text-indigo-700" },
  6: { solid: "bg-rose-600", text: "text-rose-700" },
  7: { solid: "bg-green-600", text: "text-green-700" },
  8: { solid: "bg-green-700", text: "text-green-800" },
};

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

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

function StepBadge({ index, state }: { index: number; state: StepState }) {
  if (state === "done") {
    return (
      <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center z-10 shrink-0 shadow-xs">
        <CheckCircle2 className="h-4 w-4 text-white" />
      </div>
    );
  }
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white z-10 shrink-0 shadow-xs ${
        state === "current" ? `${STEP_COLORS[index].solid} ring-2 ring-offset-1 ring-slate-200 animate-pulse` : "bg-slate-200"
      }`}
    >
      {index}
    </div>
  );
}

function StepStatePill({ state }: { state: StepState }) {
  const classes =
    state === "done"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : state === "current"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-slate-50 text-slate-400 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wide border ${classes}`}>
      {state === "done" && <CheckCircle2 className="h-3 w-3" />}
      {state === "current" && <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />}
      {STEP_STATE_LABELS[state]}
    </span>
  );
}

interface StepHeaderProps {
  index: number;
  icon: LucideIcon;
  role: RoleId;
  title: string;
  subtitle: string;
  state: StepState;
}

function StepHeader({ index, icon: Icon, role, title, subtitle, state }: StepHeaderProps) {
  const style = ROLE_STYLES[role];
  return (
    <div className="flex items-start gap-2.5">
      <div className={`mt-0.5 p-1.5 rounded-lg border ${state === "pending" ? "border-slate-200 bg-slate-50 text-slate-300" : `${style.soft} ${style.accent}`}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="text-xs font-bold text-slate-800">{title}</h5>
        <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <StepStatePill state={state} />
    </div>
  );
}

function FinancialStat({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "purple" | "indigo" | "rose" | "emerald";
}) {
  const toneClasses: Record<string, string> = {
    slate: "text-slate-900",
    purple: "text-purple-700",
    indigo: "text-indigo-700",
    rose: "text-rose-700",
    emerald: "text-emerald-700",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 font-mono font-black text-sm leading-tight ${toneClasses[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

function FinancialSnapshot({ project }: { project: Project }) {
  const approved = approvedOf(project);
  const released = (project.advancePaidAmount ?? 0) + (project.finalPaidAmount ?? 0);
  const pct = approved > 0 ? Math.min(100, Math.round((released / approved) * 100)) : 0;
  const winner = winnerOf(project);
  const variance = winner && project.estimatedTotal > 0 ? ((winner.totalCost - project.estimatedTotal) / project.estimatedTotal) * 100 : null;

  return (
    <section aria-label="Snapshot financiero">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <FinancialStat label="Estimado materiales" value={`$${fmtMoney(project.estimatedTotal)}`} tone="slate" />
        <FinancialStat
          label="Tope aprobado"
          value={project.approvedInvestmentAmount != null ? `$${fmtMoney(project.approvedInvestmentAmount)}` : "—"}
          sub={project.approvedInvestmentAmount == null ? "Pendiente Procura" : undefined}
          tone={project.approvedInvestmentAmount != null ? "purple" : "slate"}
        />
        <FinancialStat
          label="Contrato final"
          value={winner ? `$${fmtMoney(winner.totalCost)}` : "—"}
          sub={variance != null ? `${variance >= 0 ? "+" : ""}${variance.toFixed(1)}% vs estimado` : "Sin adjudicar"}
          tone={winner ? "indigo" : "slate"}
        />
        <FinancialStat
          label="Anticipo pagado"
          value={project.advancePaidAmount ? `$${fmtMoney(project.advancePaidAmount)}` : "—"}
          sub={project.advancePaidDate ?? undefined}
          tone={project.advancePaidAmount ? "rose" : "slate"}
        />
        <FinancialStat
          label="Liquidación final"
          value={project.finalPaidAmount ? `$${fmtMoney(project.finalPaidAmount)}` : "—"}
          sub={project.finalPaidDate ?? undefined}
          tone={project.finalPaidAmount ? "emerald" : "slate"}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Liberado total</div>
          <div className="mt-1 font-mono font-black text-sm text-sky-700">${fmtMoney(released)}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${pct >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-sky-400 to-sky-600"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600 whitespace-nowrap">{pct}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectOrganigrama({ project }: { project: Project }) {
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

function WorkflowTimeline({ project }: { project: Project }) {
  const winner = winnerOf(project);

  const stepProps = (index: number) => {
    const state = getStepState(project, index);
    const color = STEP_COLORS[index];
    return { state, color };
  };

  return (
    <section aria-label="Trazabilidad de retornos e integraciones">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1.5">
        Trazabilidad de Retornos e Integraciones (Organigrama IVOO)
      </h4>

      <div className="space-y-5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {/* Paso 1: Registro */}
        <div className="flex gap-3 relative">
          <StepBadge index={1} state={stepProps(1).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={1} icon={Building2} role="PRESIDENCIA" title="Infraestructura / Mantenimiento" subtitle="Registro técnico de requerimientos de insumos." state={stepProps(1).state} />
            <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600">
              <strong>Descripción:</strong> {project.description}
              <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 font-mono font-medium text-slate-500">
                Presupuesto Estimado Inicial: {fmtMoney(project.estimatedTotal)} USD
              </div>
            </div>
          </div>
        </div>

        {/* Paso 2: Cierre de Obra */}
        <div className="flex gap-3 relative">
          <StepBadge index={2} state={stepProps(2).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={2} icon={FileSearch} role="CIERRE_DE_OBRA" title="Revisión Técnica Cierre de Obra" subtitle="Cálculos de inversión, volumen de material y planimetría." state={stepProps(2).state} />
            {project.cierreObraNotes ? (
              <div className="mt-2 bg-blue-50/40 p-3 rounded-lg border border-blue-100 text-[11px] text-slate-600">
                <strong>Notas Cierre de Obra:</strong> {project.cierreObraNotes}
                <div className="mt-1 flex items-center gap-2 text-[10px] text-blue-700 font-mono font-semibold">
                  <span>&bull; Planos: {project.blueprintsCount || 0}</span>
                  <span>&bull; Cálculos: {project.calculationsAdded ? "Adjuntados" : "No"}</span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Paso pendiente de revisión técnica.</p>
            )}
          </div>
        </div>

        {/* Paso 3: Aprobación Procura */}
        <div className="flex gap-3 relative">
          <StepBadge index={3} state={stepProps(3).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={3} icon={TrendingUp} role="PROCURA" title="Aprobación Presupuestaria Procura" subtitle="Autorización de inversión máxima autorizada para licitación." state={stepProps(3).state} />
            {project.approvedInvestmentAmount ? (
              <div className="mt-2 bg-purple-50/40 p-3 rounded-lg border border-purple-100 text-[11px] text-slate-600">
                <strong>Tope Presupuestario:</strong> {fmtMoney(project.approvedInvestmentAmount)} USD
                <p className="mt-1 text-slate-500"><strong>Nota Procura:</strong> {project.procuraReviewNotes}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Pendiente de tope presupuestario.</p>
            )}
          </div>
        </div>

        {/* Paso 4: Licitación & Cuadro Comparativo */}
        <div className="flex gap-3 relative">
          <StepBadge index={4} state={stepProps(4).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={4} icon={Users} role="ANALISTA" title="Licitación & Cuadro Comparativo Analistas" subtitle="Carga de propuestas físicas y consolidación de terna." state={stepProps(4).state} />
            {project.proposals && project.proposals.length > 0 ? (
              <div className="mt-2 space-y-1 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 text-[11px]">
                <span className="font-bold text-emerald-800 uppercase text-[9px] tracking-wider">Ofertas recibidas ({project.proposals.length}):</span>
                <ul className="space-y-1.5 text-slate-600">
                  {project.proposals.map((pr) => (
                    <li key={pr.id} className="flex items-center justify-between gap-2 font-mono">
                      <span className="min-w-0 truncate">{pr.contractorName} ({pr.contractorCode})</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {pr.contractorRating != null && (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {pr.contractorRating.toFixed(1)}
                          </span>
                        )}
                        {pr.deliveryWeeks > 0 && <span className="text-slate-400 text-[10px]">{pr.deliveryWeeks} sem</span>}
                        <span className="font-bold">${fmtMoney(pr.totalCost)}</span>
                      </span>
                    </li>                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Pendiente de cotizaciones.</p>
            )}
          </div>
        </div>

        {/* Paso 5: Adjudicación */}
        <div className="flex gap-3 relative">
          <StepBadge index={5} state={stepProps(5).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={5} icon={ShieldCheck} role="PROCURA" title="Adjudicación por Procura" subtitle="Adjudicación del contratista final de la base de datos." state={stepProps(5).state} />
            {project.selectedContractorCode ? (
              <div className="mt-2 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100 text-[11px] text-slate-700 font-semibold">
                <div>Proveedor Adjudicado: {project.selectedContractorCode}</div>
                {winner && (
                  <div className="mt-1 text-[10px] font-mono text-slate-500 font-medium">
                    {winner.contractorName} · ${fmtMoney(winner.totalCost)}
                    {winner.contractorRating != null && (
                      <span className="inline-flex items-center gap-0.5 ml-1.5 text-amber-600 font-bold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {winner.contractorRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Pendiente de adjudicar ganador.</p>
            )}
          </div>
        </div>

        {/* Paso 6: Anticipo Finanzas */}
        <div className="flex gap-3 relative">
          <StepBadge index={6} state={stepProps(6).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={6} icon={Wallet} role="FINANZAS" title="Anticipo Finanzas (Inicio de Obra)" subtitle="Liberación bancaria del anticipo para el arranque." state={stepProps(6).state} />
            {project.advancePaidAmount ? (
              <div className="mt-2 bg-rose-50/40 p-3 rounded-lg border border-rose-100 text-[11px] text-slate-600">
                <strong>Anticipo Transferido:</strong> {fmtMoney(project.advancePaidAmount)} USD
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Fecha Valor: {project.advancePaidDate}</div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Arranque pendiente de pago de anticipo.</p>
            )}
          </div>
        </div>

        {/* Paso 7: Auditoría & Calidad */}
        <div className="flex gap-3 relative">
          <StepBadge index={7} state={stepProps(7).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={7} icon={ShieldCheck} role="CIERRE_DE_OBRA" title="Auditoría & Calidad Cierre de Obra" subtitle="Inspección final física de la infraestructura completada." state={stepProps(7).state} />
            {project.qualityVerified ? (
              <div className="mt-2 bg-green-50/40 p-3 rounded-lg border border-green-100 text-[11px] text-slate-600 flex items-center gap-1.5 font-semibold text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                Obra certificada con estándares óptimos el {project.completionVerifiedDate}.
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Pendiente de verificación técnica final de calidad.</p>
            )}
          </div>
        </div>

        {/* Paso 8: Liquidación Final */}
        <div className="flex gap-3 relative">
          <StepBadge index={8} state={stepProps(8).state} />
          <div className="flex-1 min-w-0">
            <StepHeader index={8} icon={Landmark} role="FINANZAS" title="Liquidación Final Finanzas" subtitle="Pago de liquidación del saldo restante y cierre de cuenta." state={stepProps(8).state} />
            {project.finalPaidAmount ? (
              <div className="mt-2 bg-green-950 text-white p-3 rounded-lg text-[11px] font-semibold">
                Liquidación Final de {fmtMoney(project.finalPaidAmount)} USD Transferida el {project.finalPaidDate}.
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 italic">Pendiente de liquidación bancaria.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function InspectProjectModal({ isOpen, project, onClose }: InspectProjectModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      badge="Expediente de Obra"
      title={project?.title ?? ""}
      infoLine={project ? `${project.id} • ${project.type}` : undefined}
      icon={<Building2 className="h-5 w-5" />}
      iconColor="sky"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end">
          <button
            id="btn-close-inspect-footer"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      }
    >
      {!project ? (
        <EmptyState message="Proyecto no disponible." />
      ) : (
        <>
          {/* Metadata + estado actual */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusBadge code={project.status} className="text-sm font-bold px-2.5 py-1" />
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {project.location}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              Apertura {project.createdDate}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              hace {daysBetween(project.createdDate)}d
              {project.updatedAt ? ` · act. ${new Date(project.updatedAt).toLocaleDateString("en-US")}` : ""}
            </span>
          </div>

          <FinancialSnapshot project={project} />

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-sky-500" />
              Flujo de Decisiones Organigrama IVOO
            </h3>
            <p className="text-xs text-slate-500 mb-3 font-medium">
              Posición actual del proyecto en el flujo del sistema.
              {project.status === ProjectStatus.EN_EJECUCION
                ? " La obra se encuentra en ejecución bajo supervisión."
                : project.status === ProjectStatus.COMPLETADO_PAGADO
                  ? " Ciclo cerrado: obra entregada y liquidada."
                  : ""}
            </p>
            <ProjectOrganigrama project={project} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <WorkflowTimeline project={project} />
          </div>
        </>
      )}
    </Modal>
  );
}
