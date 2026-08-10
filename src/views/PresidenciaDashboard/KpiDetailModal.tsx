/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección para las 4 KPI cards principales de Presidencia.
 * Muestra la explicación de cómo se calcula cada métrica y un desglose
 * usando datos de DashboardSummary y, cuando aporta trazabilidad, de los
 * proyectos individuales (sin nuevos endpoints).
 */

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock, DollarSign, Layers } from "lucide-react";
import Modal from "../../components/UI/Modal";
import type { DashboardSummary, Project } from "../../types";
import { STATUS_LABELS } from "../../utils";
import { approvedOf, releasedOf } from "../../utils/dashboardSummary";

export type KpiKind = "approved" | "released" | "pending" | "projects" | null;

interface KpiDetailModalProps {
  kind: KpiKind;
  onClose: () => void;
  summary: DashboardSummary;
  projects: Project[];
  totalProjectsCount: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ExplainBlock({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
      {children}
    </p>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-[12px] font-bold text-slate-700">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 font-medium">{sub}</p>}
      </div>
      <span className="text-[13px] font-black font-mono text-slate-900">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

/** Fila de un proyecto en una lista de detalle: título + monto destacado. */
function ProjectRow({
  title,
  status,
  amount,
  tone = "slate",
}: {
  title: string;
  status: string;
  amount: string;
  tone?: "rose" | "slate";
}) {
  const amountColor = tone === "rose" ? "text-rose-600" : "text-slate-900";
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-700 truncate">{title}</p>
        <p className="text-[10px] text-slate-400 font-medium">{STATUS_LABELS[status] ?? status}</p>
      </div>
      <span className={`text-[13px] font-black font-mono shrink-0 ${amountColor}`}>{amount}</span>
    </div>
  );
}

const KPI_META: Record<
  Exclude<KpiKind, null>,
  { title: string; icon: ReactNode; iconColor: string; badge: string }
> = {
  approved: { title: "Presupuesto Aprobado", icon: <DollarSign className="h-5 w-5" />, iconColor: "sky", badge: "Inversión" },
  released: { title: "Fondos Liquidados", icon: <CheckCircle2 className="h-5 w-5" />, iconColor: "emerald", badge: "Ejecución" },
  pending: { title: "Compromisos Pendientes", icon: <Clock className="h-5 w-5" />, iconColor: "rose", badge: "Por pagar" },
  projects: { title: "Estado de Proyectos", icon: <Layers className="h-5 w-5" />, iconColor: "sky", badge: "Pipeline" },
};

export default function KpiDetailModal({
  kind,
  onClose,
  summary,
  projects,
  totalProjectsCount,
  activeProjectsCount,
  completedProjectsCount,
}: KpiDetailModalProps) {
  const isOpen = kind !== null;
  const meta = kind ? KPI_META[kind] : null;

  // Proyectos cuyo pagado supera lo aprobado — causantes de la sobre-ejecución.
  const overBudgetProjects = projects
    .map((p) => ({ p, approved: approvedOf(p), released: releasedOf(p) }))
    .filter(({ approved, released }) => released > approved)
    .map(({ p, approved, released }) => ({ p, excess: released - approved }))
    .sort((a, b) => b.excess - a.excess);

  // Proyectos con saldo aprobado aún no liquidado — fondos retenidos por obra.
  const retainedProjects = projects
    .map((p) => ({ p, approved: approvedOf(p), released: releasedOf(p) }))
    .map(({ p, approved, released }) => ({ p, retained: approved - released }))
    .filter(({ retained }) => retained > 0)
    .sort((a, b) => b.retained - a.retained)
    .slice(0, 10);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={meta?.icon}
      iconColor={meta?.iconColor}
      badge={meta?.badge}
      title={meta?.title}
      maxWidth="max-w-lg"
    >
      {kind === "approved" && (
        <>
          <ExplainBlock>
            Suma del monto aprobado de todos los proyectos registrados en base de datos,
            sin importar su estado actual. Representa la inversión total autorizada por
            Presidencia hasta la fecha.
          </ExplainBlock>
          <div>
            <p className="text-2xl font-black font-mono text-slate-900 mb-1">
              ${fmt(summary.totalApprovedInvestment)}
            </p>
            <SectionLabel>Desglose por tipo de obra</SectionLabel>
            {summary.typeBreakdown.map((t) => (
              <Row key={t.type} label={t.type} value={`$${fmt(t.approvedAmount)}`} sub={`${t.count} proyectos`} />
            ))}
          </div>
        </>
      )}

      {kind === "released" && (
        <>
          <ExplainBlock>
            Monto efectivamente liquidado (pagado) sobre el total aprobado. El porcentaje
            indica cuánto del presupuesto ya fue ejecutado. Si un proyecto recibe pagos
            por encima de su monto aprobado, aparece como sobre-ejecución.
          </ExplainBlock>
          <div>
            <p className="text-2xl font-black font-mono text-slate-900 mb-1">
              ${fmt(summary.totalReleasedFunds)}
            </p>
            <p className="text-[11px] text-slate-500 font-bold mb-3">
              {Math.min(100, summary.releasedPercent)}% del presupuesto aprobado
            </p>

            {overBudgetProjects.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-1 p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="text-[11px] font-bold text-rose-700">
                    ${fmt(summary.excessReleased)} en sobre-ejecución, generados por {overBudgetProjects.length}{" "}
                    proyecto{overBudgetProjects.length === 1 ? "" : "s"}
                  </span>
                </div>
                <SectionLabel>Proyectos con exceso sobre lo aprobado</SectionLabel>
                {overBudgetProjects.map(({ p, excess }) => (
                  <ProjectRow key={p.id} title={p.title} status={p.status} amount={`+$${fmt(excess)}`} tone="rose" />
                ))}
              </>
            ) : (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ningún proyecto excede su presupuesto aprobado
              </p>
            )}

            <SectionLabel>Comprometido en contratos activos</SectionLabel>
            <Row label="Total comprometido" value={`$${fmt(summary.totalCommittedAmount)}`} sub="Contratos firmados aún en ejecución" />
          </div>
        </>
      )}

      {kind === "pending" && (
        <>
          <ExplainBlock>
            Fondos que ya fueron aprobados pero aún no se han pagado por completo.
            Corresponde a la diferencia entre lo aprobado y lo efectivamente liquidado
            en cada proyecto — dinero retenido en trámite, ordenado de mayor a menor.
          </ExplainBlock>
          <div>
            <p className="text-2xl font-black font-mono text-slate-900 mb-3">
              ${fmt(summary.pendingFunds)}
            </p>
            {retainedProjects.length > 0 ? (
              <>
                <SectionLabel>Proyectos con mayor saldo retenido</SectionLabel>
                {retainedProjects.map(({ p, retained }) => (
                  <ProjectRow key={p.id} title={p.title} status={p.status} amount={`$${fmt(retained)}`} />
                ))}
              </>
            ) : (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> No hay saldos aprobados pendientes de liquidar
              </p>
            )}

            <SectionLabel>Comprometido por fase del pipeline</SectionLabel>
            {summary.funnel
              .filter((f) => f.committedAmount > 0)
              .map((f) => (
                <Row
                  key={f.status}
                  label={STATUS_LABELS[f.status] ?? f.status}
                  value={`$${fmt(f.committedAmount)}`}
                  sub={`${f.count} proyectos en esta fase`}
                />
              ))}
          </div>
        </>
      )}

      {kind === "projects" && (
        <>
          <ExplainBlock>
            Conteo de todos los proyectos registrados, agrupados por estado dentro del
            pipeline. "Activos" son los que están en ejecución (ni recién creados ni
            pagados); "Pagados" son los que completaron su ciclo de liquidación.
          </ExplainBlock>
          <div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-black font-mono text-slate-900">{totalProjectsCount}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">proyectos totales</span>
            </div>
            <Row label="Activos" value={String(activeProjectsCount)} sub="En ejecución" />
            <Row label="Pagados" value={String(completedProjectsCount)} sub="Ciclo completado" />
            <SectionLabel>Por fase del pipeline</SectionLabel>
            {summary.funnel.map((f) => (
              <Row key={f.status} label={STATUS_LABELS[f.status] ?? f.status} value={String(f.count)} />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}