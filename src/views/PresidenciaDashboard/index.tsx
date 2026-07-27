/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { ProjectStatus } from "../../types";
import type { Project, AuditLog } from "../../types";
import { SkeletonStats, SkeletonStatsDark, SkeletonTable, SkeletonCard } from "../../components/SkeletonLoader";
import { useProjectFinancials } from "../../hooks/useProjectFinancials";
import { containerVariants } from "../../animations";
import KpiSection from "./KpiSection";
import DistributionChart from "./DistributionChart";
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
  // ── Derived stats ──
  const totalProjectsCount = projects.length;
  const completedProjects = useMemo(() => projects.filter(p => p.status === ProjectStatus.COMPLETADO_PAGADO), [projects]);
  const activeProjects = useMemo(() => projects.filter(p => p.status !== ProjectStatus.COMPLETADO_PAGADO && p.status !== ProjectStatus.CREADO), [projects]);

  const { totalApprovedInvestment, totalReleasedFunds, pendingFunds, releasedPercent } = useProjectFinancials(projects);

  if (isLoading) return <PresidenciaSkeleton />;

  const infraCount = projects.filter(p => p.type === "INFRAESTRUCTURA").length;
  const mantCount = projects.filter(p => p.type === "MANTENIMIENTO").length;

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* Page title for screen readers */}
      <h1 className="sr-only">Presidencia</h1>

      <KpiSection
        totalApprovedInvestment={totalApprovedInvestment}
        totalReleasedFunds={totalReleasedFunds}
        releasedPercent={releasedPercent}
        pendingFunds={pendingFunds}
        totalProjectsCount={totalProjectsCount}
        activeProjectsCount={activeProjects.length}
        completedProjectsCount={completedProjects.length}
      />

      <DistributionChart infraCount={infraCount} mantCount={mantCount} />

      <AuditLogSection auditLogs={auditLogs} />

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
      <SkeletonTable rows={4} columns={7} />
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}
