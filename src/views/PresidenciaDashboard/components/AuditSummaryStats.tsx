/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de inteligencia sobre el mismo conjunto filtrado que la tabla de
 * auditoría (AuditLogSection): actividad diaria (últimos 30 días), reparto
 * por rol, acciones más frecuentes y proyectos con más movimiento. Da a
 * Presidencia el "flujo completo" que una tabla plana no puede transmitir —
 * volumen, quién actúa, sobre qué y cuándo, de un vistazo.
 *
 * Mismo patrón visual que la pestaña Estadísticas (KpiSection +
 * DistributionChart/FinancialOverviewSection): tarjetas independientes en
 * flujo normal de página, no un panel envuelto dentro de otra tarjeta — así
 * la vista de Auditoría queda repartida uniformemente igual que el resto del
 * dashboard, en vez de apilar todo en una sola caja.
 */

import { motion } from "motion/react";
import { Activity, BarChart3, Building2, CalendarDays, Loader2, Shield } from "lucide-react";
import type { AuditLogSummary } from "@/hooks/useAuditLogs";
import { getRoleColor } from "@/utils";
import { containerVariants, itemVariants } from "@/animations";
import KpiCard from "@/components/UI/KpiCard";

function DailyActivityChart({ daily }: { daily: AuditLogSummary["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.total));
  const total = daily.reduce((sum, d) => sum + d.total, 0);
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-black font-mono text-slate-800">{total.toLocaleString("es")}</span>
        <span className="text-[11px] font-semibold text-slate-400">eventos en el rango</span>
      </div>
      <div className="relative flex items-end gap-[3px] h-24 border-b border-slate-100">
        {daily.map((d) => (
          <div key={d.day} className="group relative flex-1 flex flex-col items-center justify-end h-full">
            <div
              className={`w-full min-h-[3px] rounded-t-sm transition-colors ${
                d.total > 0
                  ? "bg-gradient-to-t from-sky-500 to-sky-300 group-hover:from-sky-600 group-hover:to-sky-400"
                  : "bg-slate-100 group-hover:bg-slate-200"
              }`}
              style={{ height: `${Math.max(d.total > 0 ? 6 : 2, Math.round((d.total / max) * 100))}%` }}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
              {d.day}: {d.total}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[9px] font-mono font-semibold text-slate-300 uppercase tracking-wide">
        <span>{daily[0]?.day}</span>
        <span>{daily[daily.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function RankedBar({ rank, label, total, max, color, active, onClick }: { rank: number; label: string; total: number; max: number; color: string; active?: boolean; onClick?: () => void }) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={onClick ? `Filtrar por: ${label}` : label}
      className={`flex items-center gap-3 group w-full text-left rounded-lg -mx-1.5 px-1.5 py-0.5 transition-colors ${onClick ? "cursor-pointer" : ""} ${active ? "bg-sky-50 ring-1 ring-sky-200" : ""}`}
    >
      <span className={`flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-mono font-black transition-colors ${active ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600"}`}>
        {rank}
      </span>
      <span className={`w-28 flex-shrink-0 text-xs font-bold truncate transition-colors ${active ? "text-sky-700" : "text-slate-600 group-hover:text-slate-900"}`}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-700 ${onClick ? "group-hover:scale-y-125 group-hover:origin-bottom" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-black text-slate-800 w-8 text-right">{total}</span>
    </Tag>
  );
}

interface AuditSummaryStatsProps {
  summary: AuditLogSummary | null;
  isLoading: boolean;
  /** Drill-down: aplica un filtro directamente desde el panel de resumen (rol, acción o proyecto). */
  onDrillDown?: (kind: "role" | "action" | "projectId", value: string) => void;
  /** Filtros activos en la tabla de abajo — resaltan la barra correspondiente aquí arriba, para que el resumen refleje lo que ya está filtrado. */
  activeRole?: string;
  activeAction?: string;
  activeProjectId?: string;
}

export default function AuditSummaryStats({ summary, isLoading, onDrillDown, activeRole, activeAction, activeProjectId }: AuditSummaryStatsProps) {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 flex items-center justify-center h-24 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ))}
      </div>
    );
  }
  if (!summary || summary.total === 0) return null;

  const maxAction = Math.max(1, ...summary.byAction.map((a) => a.total));
  const maxProject = Math.max(1, ...summary.byProject.map((p) => p.total));
  const maxRole = Math.max(1, ...summary.byRole.map((r) => r.total));
  const topRole = summary.byRole[0];
  const activeDays = summary.daily.filter((d) => d.total > 0).length;

  return (
    <>
      {/* ── KPIs de auditoría — mismas KpiCard que Estadísticas, tarjetas independientes en grid ── */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={<Activity className="h-5 w-5" />}
            label="Eventos Totales"
            variant="dark"
            borderAccent="border-l-sky-500"
            tooltip="Total de registros de auditoría que coinciden con los filtros activos."
          >
            <span className="text-3xl font-black font-mono bg-gradient-to-r from-white to-sky-200 bg-clip-text text-transparent tabular-nums">{summary.total.toLocaleString("es")}</span>
          </KpiCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <KpiCard
            icon={<Building2 className="h-5 w-5" />}
            label="Sin Proyecto"
            borderAccent="border-l-slate-300"
            tooltip="Eventos auditables no asociados a ningún proyecto (ej. restablecimientos de contraseña)."
          >
            <span className="text-3xl font-black font-mono text-slate-800 tabular-nums">{summary.withoutProject.toLocaleString("es")}</span>
          </KpiCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <KpiCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Días Activos (30d)"
            borderAccent="border-l-sky-400"
            tooltip="Días de los últimos 30 con al menos un evento registrado."
          >
            <span className="text-3xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent tabular-nums">{activeDays}</span>
            <span className="text-[11px] font-medium text-slate-400 ml-1">/ 30</span>
          </KpiCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <KpiCard
            icon={<Shield className="h-5 w-5" />}
            label="Rol Más Activo"
            borderAccent="border-l-sky-400"
            tooltip="Rol con más eventos de auditoría dentro del conjunto filtrado."
          >
            {topRole ? (
              <div className="flex items-center gap-2">
                <span className={`inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${getRoleColor(topRole.role)}`}>{topRole.role}</span>
                <span className="text-[11px] font-mono font-bold text-slate-400">{topRole.total.toLocaleString("es")}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-300 italic">—</span>
            )}
          </KpiCard>
        </motion.div>
      </motion.div>

      {/* ── Gráficos de resumen — mismo patrón que DistributionChart/FinancialOverviewSection: tarjetas separadas en grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad diaria */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
              <Activity className="h-4 w-4 text-sky-500" />
            </div>
            <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">Actividad (30 días)</h4>
          </div>
          {summary.daily.length > 0 ? (
            <DailyActivityChart daily={summary.daily} />
          ) : (
            <p className="text-xs text-slate-300 italic py-8 text-center">Sin actividad en el rango.</p>
          )}
        </motion.div>

        {/* Reparto por rol */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
              <BarChart3 className="h-4 w-4 text-sky-500" />
            </div>
            <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">Por Rol</h4>
          </div>
          <div className="space-y-3">
            {summary.byRole.map((r) => {
              const pct = maxRole > 0 ? Math.round((r.total / maxRole) * 100) : 0;
              const active = activeRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => onDrillDown?.("role", r.role)}
                  title={onDrillDown ? `Filtrar por rol: ${r.role}` : undefined}
                  className={`group flex flex-col gap-1.5 w-full text-left rounded-lg -mx-1.5 px-1.5 py-1 transition-colors ${onDrillDown ? "cursor-pointer" : ""} ${active ? "bg-sky-50 ring-1 ring-sky-200" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-transform ${getRoleColor(r.role)} ${onDrillDown ? "group-hover:scale-105" : ""} ${active ? "ring-2 ring-sky-400 ring-offset-1" : ""}`}>{r.role}</span>
                    <span className="text-xs font-mono font-black text-slate-800">{r.total}</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all duration-700 ${active ? "bg-sky-600" : "bg-sky-400 group-hover:bg-sky-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Top acciones / proyectos */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-sky-400 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
                <Activity className="h-4 w-4 text-sky-500" />
              </div>
              <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">Acciones Frecuentes</h4>
            </div>
            <div className="space-y-2.5">
              {summary.byAction.slice(0, 4).map((a, i) => (
                <RankedBar key={a.action} rank={i + 1} label={a.action} total={a.total} max={maxAction} color="bg-sky-400" active={activeAction === a.action} onClick={onDrillDown ? () => onDrillDown("action", a.action) : undefined} />
              ))}
            </div>
          </div>
          {summary.byProject.length > 0 && (
            <div className="pt-5 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <h4 className="font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400">Proyectos con Más Movimiento</h4>
              </div>
              <div className="space-y-2.5">
                {summary.byProject.slice(0, 4).map((p, i) => (
                  <RankedBar key={p.projectId} rank={i + 1} label={p.projectTitle || p.projectId} total={p.total} max={maxProject} color="bg-slate-400" active={activeProjectId === p.projectId} onClick={onDrillDown ? () => onDrillDown("projectId", p.projectId) : undefined} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
