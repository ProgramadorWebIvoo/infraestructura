/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resumen financiero agregado del departamento: donut de progreso de fondos
 * liberados vs presupuesto aprobado + métricas claras (aprobado, comprometido,
 * liberado, pendiente) + indicadores de negociación (anticipo y plazo promedio)
 * + KPIs secundarios (ticket promedio, eficiencia de pago, sobrecostos, fondos
 * en riesgo) + distribución de inversión por tipo de obra y ubicación + obras
 * estancadas con fondos comprometidos + comportamiento de desembolsos + top
 * contratistas por monto liberado + tendencia mensual de desembolsos.
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Wallet, HandCoins, CalendarClock, AlertTriangle, TrendingUp, Lock, CircleDollarSign, Award, BarChart3, Building2, MapPin, Timer, Receipt, Gauge } from "lucide-react";
import type { Project } from "@/types";
import { itemVariants } from "@/animations";
import { computeDashboardSummary, approvedOf, releasedOf, daysBetween, STALLED_THRESHOLD_DAYS } from "@/utils/dashboardSummary";
import RankBar from "@/components/UI/RankBar";
import type { LedgerEntry } from "./LedgerSection";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Donut de progreso: un solo anillo que muestra el % liberado del presupuesto. */
function ProgressDonut({ percent, centerValue, centerLabel }: { percent: number; centerValue: string; centerLabel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const len = (clamped / 100) * circumference;

  // Arranca en 0 y anima al valor real tras el montaje — igual que las
  // barras de KpiSection, el dasharray ya calculado en el primer render
  // nunca dispararía la transición por sí solo.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative flex w-full items-center justify-center">
      <svg viewBox="0 0 170 170" className="w-full h-auto transform -rotate-90 drop-shadow-sm" role="img" aria-label={`Progreso de fondos liberados: ${clamped}%`}>
        <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        <circle
          cx="85" cy="85" r={radius} fill="none"
          stroke="url(#progressGradient)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={filled ? `${len} ${circumference - len}` : `0 ${circumference}`}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-slate-800 font-mono">{centerValue}</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase font-sans">{centerLabel}</span>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  amount: number;
  sub: string;
  accent: string;
  iconBg: string;
}

function MetricCard({ icon, label, amount, sub, accent, iconBg }: MetricCardProps) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <p className={`text-lg font-black font-mono ${accent}`}>${fmtMoney(amount)}</p>
      <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
    </div>
  );
}

interface FinancialSummarySectionProps {
  projects: Project[];
  /** Diario de egresos ya calculado por FinanzasPanel — reusado para la tendencia mensual de desembolsos, sin duplicar su derivación. */
  paidLedger: LedgerEntry[];
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
  iconBg: string;
}

/** Pill compacto para KPIs financieros secundarios (fila superior de contexto). */
function StatPill({ icon, label, value, sub, accent, iconBg }: StatPillProps) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 truncate">{label}</p>
        <p className={`text-base font-black font-mono leading-tight ${accent}`}>{value}</p>
        <p className="text-[9px] text-slate-400 font-medium truncate">{sub}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-indigo-500">{icon}</span>
      <h3 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">{label}</h3>
    </div>
  );
}

const CARD = "bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-300";

export default function FinancialSummarySection({ projects, paidLedger }: FinancialSummarySectionProps) {
  const summary = computeDashboardSummary(projects);
  const { totalApprovedInvestment, totalCommittedAmount, totalReleasedFunds, pendingFunds, excessReleased } = summary;
  const base = totalApprovedInvestment || 1;
  const releasedPct = Math.min(100, (totalReleasedFunds / base) * 100);
  const committedPct = Math.min(100, (totalCommittedAmount / base) * 100);
  const pendingPct = Math.min(100, (pendingFunds / base) * 100);
  const overBudget = excessReleased > 0;
  const maxContractor = Math.max(1, ...summary.topContractors.map((c) => c.totalAmount));

  // Métricas financieras secundarias — derivadas de los mismos proyectos,
  // sin duplicar reglas de negocio ya resueltas en computeDashboardSummary.
  const projectsWithBudget = projects.filter((p) => approvedOf(p) > 0);
  const avgApprovedPerProject = projectsWithBudget.length
    ? projectsWithBudget.reduce((s, p) => s + approvedOf(p), 0) / projectsWithBudget.length
    : 0;
  const overrunProjects = projects.filter((p) => releasedOf(p) > approvedOf(p) && approvedOf(p) > 0);
  const executionEfficiencyPct = totalCommittedAmount > 0
    ? Math.min(100, (totalReleasedFunds / totalCommittedAmount) * 100)
    : 0;

  // Obras con fondos comprometidos en riesgo: estancadas (sin actividad) y
  // con dinero aprobado que aún no se libera por completo. Se recalcula
  // estancamiento directamente sobre `projects` (no sobre
  // summary.stalledProjects, que ya viene recortado a las 10 obras con más
  // días de inactividad) para no perder obras con menor antigüedad pero
  // mayor exposición financiera.
  const allAtRiskProjects = projects
    .filter((p) => p.status !== "COMPLETADO_PAGADO")
    .map((p) => {
      const referenceDate = p.updatedAt ? p.updatedAt.slice(0, 10) : p.createdDate;
      const daysSinceUpdate = daysBetween(referenceDate);
      const exposedAmount = Math.max(0, approvedOf(p) - releasedOf(p));
      return { id: p.id, title: p.title, daysSinceUpdate, exposedAmount };
    })
    .filter((sp) => sp.daysSinceUpdate >= STALLED_THRESHOLD_DAYS && sp.exposedAmount > 0)
    .sort((a, b) => b.exposedAmount - a.exposedAmount);
  const totalAtRiskAmount = allAtRiskProjects.reduce((s, sp) => s + sp.exposedAmount, 0);
  const atRiskProjects = allAtRiskProjects.slice(0, 5);
  const maxAtRisk = Math.max(1, ...atRiskProjects.map((sp) => sp.exposedAmount));
  const maxType = Math.max(1, ...summary.typeBreakdown.map((t) => t.approvedAmount));
  const maxLocation = Math.max(1, ...summary.locationBreakdown.map((l) => l.approvedAmount));

  const avgDisbursement = paidLedger.length
    ? paidLedger.reduce((s, tx) => s + tx.amount, 0) / paidLedger.length
    : 0;
  const largestDisbursement = paidLedger.reduce(
    (max, tx) => (tx.amount > max.amount ? tx : max),
    { amount: 0, title: "—", date: "" } as Pick<LedgerEntry, "amount" | "title" | "date">,
  );

  // Tendencia mensual de desembolsos reales (no de creación de obras) —
  // derivada del diario de egresos, últimos 6 meses con actividad.
  const monthlyDisbursements = (() => {
    const byMonth = new Map<string, number>();
    for (const tx of paidLedger) {
      const month = tx.date.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + tx.amount);
    }
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  })();
  const maxMonth = Math.max(1, ...monthlyDisbursements.map(([, amount]) => amount));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth space-y-4 pr-1">
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-indigo-400"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
          <Wallet className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Ejecución Financiera del Portafolio</h2>
          <p className="text-[11px] text-slate-500 font-medium">Fondos liberados vs presupuesto aprobado</p>
        </div>
        {overBudget && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
            <AlertTriangle className="h-3 w-3" />
            Sobre-ejecución ${fmtMoney(excessReleased)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Donut de progreso */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-full max-w-[170px]">
            <ProgressDonut
              percent={releasedPct}
              centerValue={`${Math.round(releasedPct)}%`}
              centerLabel="Liberado"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
            {overBudget
              ? "Los fondos liberados superan el presupuesto aprobado."
              : `Se ha liberado ${Math.round(releasedPct)}% del presupuesto aprobado.`}
          </p>
        </div>

        {/* Métricas claras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:col-span-2">
          <MetricCard
            icon={<CircleDollarSign className="h-4 w-4 text-sky-600" />}
            iconBg="bg-sky-50"
            label="Presupuesto Aprobado"
            amount={totalApprovedInvestment}
            sub="Referencia del total (100%)"
            accent="text-sky-700"
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4 text-indigo-600" />}
            iconBg="bg-indigo-50"
            label="Comprometido"
            amount={totalCommittedAmount}
            sub={`${Math.round(committedPct)}% del presupuesto aprobado`}
            accent="text-indigo-700"
          />
          <MetricCard
            icon={<Wallet className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Fondos Liberados"
            amount={totalReleasedFunds}
            sub={overBudget ? "Excede lo aprobado" : `${Math.round(releasedPct)}% del presupuesto aprobado`}
            accent="text-emerald-700"
          />
          <MetricCard
            icon={<Lock className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Pendiente por Ejecutar"
            amount={pendingFunds}
            sub={overBudget ? "No hay pendiente" : `${Math.round(pendingPct)}% del presupuesto aprobado`}
            accent="text-amber-700"
          />
        </div>
      </div>

      {/* Indicadores de negociación */}
      <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <HandCoins className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Anticipo Promedio</span>
          </div>
          <p className="text-xl font-black font-mono text-slate-800">{summary.negotiationMetrics.avgAdvancePercent}%</p>
          <p className="text-[10px] text-slate-400 font-medium">sobre propuestas adjudicadas</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Plazo Promedio</span>
          </div>
          <p className="text-xl font-black font-mono text-slate-800">
            {summary.negotiationMetrics.avgDeliveryWeeks} <span className="text-xs text-slate-500">semanas</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">entrega estimada de contratos</p>
        </div>
      </div>

      {/* KPIs financieros secundarios */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill
          icon={<Building2 className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50"
          label="Inversión Promedio por Obra"
          value={`$${fmtMoney(avgApprovedPerProject)}`}
          sub={`sobre ${projectsWithBudget.length} obra(s) con presupuesto`}
          accent="text-violet-700"
        />
        <StatPill
          icon={<Gauge className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Eficiencia de Pago"
          value={`${Math.round(executionEfficiencyPct)}%`}
          sub="liberado sobre lo comprometido"
          accent="text-emerald-700"
        />
        <StatPill
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50"
          label="Obras con Sobrecosto"
          value={String(overrunProjects.length)}
          sub="liberado supera lo aprobado"
          accent="text-rose-700"
        />
        <StatPill
          icon={<Timer className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50"
          label="Fondos en Riesgo"
          value={`$${fmtMoney(totalAtRiskAmount)}`}
          sub={`${allAtRiskProjects.length} obra(s) estancada(s)`}
          accent="text-amber-700"
        />
      </div>
    </motion.div>

    {/* Distribución de inversión por tipo de obra y ubicación */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.div variants={itemVariants} initial="hidden" animate="visible" className={CARD}>
        <SectionTitle icon={<Building2 className="h-4 w-4" />} label="Inversión por Tipo de Obra" />
        <div className="space-y-3">
          {summary.typeBreakdown.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">Sin obras registradas todavía.</p>
          ) : (
            summary.typeBreakdown
              .slice()
              .sort((a, b) => b.approvedAmount - a.approvedAmount)
              .map((t) => (
                <RankBar
                  key={t.type}
                  label={t.type}
                  value={`$${fmtMoney(t.approvedAmount)} · ${t.count} obra${t.count === 1 ? "" : "s"}`}
                  amount={t.approvedAmount}
                  max={maxType}
                />
              ))
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible" className={CARD}>
        <SectionTitle icon={<MapPin className="h-4 w-4" />} label="Inversión por Ubicación (Top 8)" />
        <div className="space-y-3">
          {summary.locationBreakdown.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">Sin obras registradas todavía.</p>
          ) : (
            summary.locationBreakdown.map((l) => (
              <RankBar
                key={l.location}
                label={l.location}
                value={`$${fmtMoney(l.approvedAmount)} · ${l.count} obra${l.count === 1 ? "" : "s"}`}
                amount={l.approvedAmount}
                max={maxLocation}
                muted={l.location === "Sin ubicación"}
              />
            ))
          )}
        </div>
      </motion.div>
    </div>

    {/* Obras con fondos comprometidos en riesgo (estancadas + presupuesto pendiente) */}
    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={CARD}>
      <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} label="Fondos en Riesgo por Obras Estancadas" />
      <div className="space-y-3">
        {atRiskProjects.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">Ninguna obra estancada tiene fondos pendientes de liberar.</p>
        ) : (
          atRiskProjects.map((sp) => (
            <RankBar
              key={sp.id}
              label={sp.title}
              value={`$${fmtMoney(sp.exposedAmount)} · ${sp.daysSinceUpdate}d sin actividad`}
              amount={sp.exposedAmount}
              max={maxAtRisk}
            />
          ))
        )}
      </div>
    </motion.div>

    {/* Estadísticas del diario de egresos */}
    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={CARD}>
      <SectionTitle icon={<Receipt className="h-4 w-4" />} label="Comportamiento de Desembolsos" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Monto Promedio por Desembolso</span>
          </div>
          <p className="text-xl font-black font-mono text-slate-800">${fmtMoney(avgDisbursement)}</p>
          <p className="text-[10px] text-slate-400 font-medium">sobre {paidLedger.length} movimiento(s)</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Mayor Desembolso Registrado</span>
          </div>
          <p className="text-xl font-black font-mono text-slate-800">${fmtMoney(largestDisbursement.amount)}</p>
          <p className="text-[10px] text-slate-400 font-medium truncate">
            {largestDisbursement.amount > 0 ? `${largestDisbursement.title} · ${largestDisbursement.date}` : "Sin desembolsos aún"}
          </p>
        </div>
      </div>
    </motion.div>

    {/* Top contratistas por monto liberado */}
    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={CARD}>
      <SectionTitle icon={<Award className="h-4 w-4" />} label="Top Contratistas por Monto Liberado" />
      <div className="space-y-3">
        {summary.topContractors.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic">Aún no hay contratos adjudicados.</p>
        ) : (
          summary.topContractors.map((c, i) => (
            <RankBar
              key={c.contractorCode}
              label={`${i + 1}. ${c.contractorName}`}
              value={`$${fmtMoney(c.totalAmount)} · ${c.projectCount} obra${c.projectCount === 1 ? "" : "s"}`}
              amount={c.totalAmount}
              max={maxContractor}
            />
          ))
        )}
      </div>
    </motion.div>

    {/* Tendencia mensual de desembolsos reales (anticipos + finiquitos pagados) */}
    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle icon={<BarChart3 className="h-4 w-4" />} label="Desembolsos por Mes (últimos 6)" />
        <span className="text-[10px] font-mono font-bold text-slate-400">Máximo: ${fmtMoney(maxMonth)}</span>
      </div>

      {monthlyDisbursements.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">Sin desembolsos registrados todavía.</p>
      ) : (
        <div
          role="img"
          aria-label={`Gráfico de desembolsos por mes. ${monthlyDisbursements.map(([m, amount]) => `${m}: $${fmtMoney(amount)}`).join(", ")}`}
        >
          <div className="flex items-end gap-3 h-36 border-b border-slate-100 pb-4">
            {monthlyDisbursements.map(([month, amount]) => (
              <div
                key={month}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full"
                title={`${month}: $${fmtMoney(amount)}`}
              >
                <span className="text-[9px] text-slate-500 font-mono font-bold whitespace-nowrap">${fmtMoney(amount)}</span>
                <div className="w-full flex-1 flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-50/50">
                  <div
                    className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md transition-all duration-700"
                    style={{ height: `${Math.max(4, (amount / maxMonth) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-mono font-medium">{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
    </div>
  );
}