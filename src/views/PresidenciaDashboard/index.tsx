/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { ProjectStatus } from "../../types";
import type { Project, AuditLog } from "../../types";
import { SkeletonStats, SkeletonStatsDark, SkeletonTable, SkeletonCard } from "../../components/SkeletonLoader";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { containerVariants } from "../../animations";
import KpiSection from "./KpiSection";
import DistributionChart from "./DistributionChart";
import StatusFunnelSection from "./StatusFunnelSection";
import FinancialOverviewSection from "./FinancialOverviewSection";
import PipelineHealthSection from "./PipelineHealthSection";
import CashFlowSection from "./CashFlowSection";
import InsightsSection from "./InsightsSection";
import AuditLogSection from "./AuditLogSection";
import MasterTableSection from "./MasterTableSection";

interface PresidenciaDashboardProps {
  projects: Project[];
  auditLogs: AuditLog[];
  onSelectProject: (project: Project) => void;
  isLoading?: boolean;
}

export default function PresidenciaDashboard({
  projects,
  auditLogs,
  onSelectProject,
  isLoading = false,
}: PresidenciaDashboardProps) {
  // Resumen ejecutivo: endpoint oficial con fallback a cálculo cliente.
  const { summary, isExact, lastSync } = useDashboardSummary(projects);

  // ── Derived stats (agregados exactos del summary cuando están disponibles) ──
  const totalProjectsCount = summary.totalProjects;
  const completedProjects = useMemo(
    () => summary.funnel.find((f) => f.status === ProjectStatus.COMPLETADO_PAGADO)?.count ?? 0,
    [summary],
  );
  const createdProjects = useMemo(
    () => summary.funnel.find((f) => f.status === ProjectStatus.CREADO)?.count ?? 0,
    [summary],
  );
  const activeProjectsCount = totalProjectsCount - completedProjects - createdProjects;

  const totalApprovedInvestment = summary.totalApprovedInvestment;
  const totalReleasedFunds = summary.totalReleasedFunds;
  const pendingFunds = summary.pendingFunds;
  const releasedPercent = Math.min(100, summary.releasedPercent);
  const excessReleased = summary.excessReleased;

  if (isLoading) return <PresidenciaSkeleton />;

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Page header (visible) */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-black text-slate-900 text-xl tracking-tight">Presidencia</h1>
          <p className="text-[11px] font-medium text-slate-500">
            Dashboard ejecutivo · indicadores y trazabilidad general
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          {!isExact && (
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
              Datos parciales (sin backend)
            </span>
          )}
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
            Sincronizado {lastSync ? new Date(lastSync).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "…"}
          </span>
        </div>
      </header>

      <KpiSection
        totalApprovedInvestment={totalApprovedInvestment}
        totalReleasedFunds={totalReleasedFunds}
        releasedPercent={releasedPercent}
        pendingFunds={pendingFunds}
        excessReleased={excessReleased}
        totalProjectsCount={totalProjectsCount}
        activeProjectsCount={activeProjectsCount}
        completedProjectsCount={completedProjects}
      />

      <StatusFunnelSection funnel={summary.funnel} totalProjects={totalProjectsCount} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart summary={summary} />
        <FinancialOverviewSection summary={summary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineHealthSection summary={summary} projects={projects} />
        <CashFlowSection projects={projects} />
      </div>

      <InsightsSection summary={summary} />

      <AuditLogSection auditLogs={auditLogs} lastSync={lastSync} />

      <MasterTableSection projects={projects} onSelectProject={onSelectProject} />
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function PresidenciaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatsDark />
        <SkeletonStats />
        <SkeletonStats />
        <SkeletonStats />
      </div>
      <SkeletonCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
      <SkeletonTable rows={4} columns={7} />
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}
