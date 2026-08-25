/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trazabilidad paso a paso del workflow (8 etapas, datos completos) —
 * extraído de InspectProjectModal.tsx (división por SRP: cada sección del
 * modal es visual y lógicamente independiente de las otras dos).
 */

import { Building2, CheckCircle2, FileSearch, Landmark, ShieldCheck, Star, TrendingUp, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import { winnerOf } from "../../../utils/dashboardSummary";
import { formatCurrency } from "../../../utils";
import { ROLE_STYLES, type RoleId } from "./roleStyles";

type StepState = "done" | "current" | "pending";

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
  icon: LucideIcon;
  role: RoleId;
  title: string;
  subtitle: string;
  state: StepState;
}

function StepHeader({ icon: Icon, role, title, subtitle, state }: StepHeaderProps) {
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

export default function WorkflowTimeline({ project }: { project: Project }) {
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
            <StepHeader icon={Building2} role="PRESIDENCIA" title="Infraestructura / Mantenimiento" subtitle="Registro técnico de requerimientos de insumos." state={stepProps(1).state} />
            <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600">
              <strong>Descripción:</strong> {project.description}
              <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 font-mono font-medium text-slate-500">
                Presupuesto Estimado Inicial: {formatCurrency(project.estimatedTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Paso 2: Cierre de Obra */}
        <div className="flex gap-3 relative">
          <StepBadge index={2} state={stepProps(2).state} />
          <div className="flex-1 min-w-0">
            <StepHeader icon={FileSearch} role="CIERRE_DE_OBRA" title="Revisión Técnica Cierre de Obra" subtitle="Cálculos de inversión, volumen de material y planimetría." state={stepProps(2).state} />
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
            <StepHeader icon={TrendingUp} role="PROCURA" title="Aprobación Presupuestaria Procura" subtitle="Autorización de inversión máxima autorizada para licitación." state={stepProps(3).state} />
            {project.approvedInvestmentAmount ? (
              <div className="mt-2 bg-purple-50/40 p-3 rounded-lg border border-purple-100 text-[11px] text-slate-600">
                <strong>Tope Presupuestario:</strong> {formatCurrency(project.approvedInvestmentAmount)}
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
            <StepHeader icon={Users} role="ANALISTA" title="Licitación & Cuadro Comparativo Analistas" subtitle="Carga de propuestas físicas y consolidación de terna." state={stepProps(4).state} />
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
                        <span className="font-bold">{formatCurrency(pr.totalCost)}</span>
                      </span>
                    </li>
                  ))}
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
            <StepHeader icon={ShieldCheck} role="PROCURA" title="Adjudicación por Procura" subtitle="Adjudicación del contratista final de la base de datos." state={stepProps(5).state} />
            {project.selectedContractorCode ? (
              <div className="mt-2 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100 text-[11px] text-slate-700 font-semibold">
                <div>Proveedor Adjudicado: {project.selectedContractorCode}</div>
                {winner && (
                  <div className="mt-1 text-[10px] font-mono text-slate-500 font-medium">
                    {winner.contractorName} · {formatCurrency(winner.totalCost)}
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
            <StepHeader icon={Wallet} role="FINANZAS" title="Anticipo Finanzas (Inicio de Obra)" subtitle="Liberación bancaria del anticipo para el arranque." state={stepProps(6).state} />
            {project.advancePaidAmount ? (
              <div className="mt-2 bg-rose-50/40 p-3 rounded-lg border border-rose-100 text-[11px] text-slate-600">
                <strong>Anticipo Transferido:</strong> {formatCurrency(project.advancePaidAmount)}
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
            <StepHeader icon={ShieldCheck} role="CIERRE_DE_OBRA" title="Auditoría & Calidad Cierre de Obra" subtitle="Inspección final física de la infraestructura completada." state={stepProps(7).state} />
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
            <StepHeader icon={Landmark} role="FINANZAS" title="Liquidación Final Finanzas" subtitle="Pago de liquidación del saldo restante y cierre de cuenta." state={stepProps(8).state} />
            {project.finalPaidAmount ? (
              <div className="mt-2 bg-green-950 text-white p-3 rounded-lg text-[11px] font-semibold">
                Liquidación Final de {formatCurrency(project.finalPaidAmount)} Transferida el {project.finalPaidDate}.
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
