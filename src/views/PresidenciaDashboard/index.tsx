/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, DollarSign, Layers, Loader2, Wallet } from "lucide-react";
import { ProjectStatus } from "@/types";
import type { Project, AuditLog } from "@/types";
import { SkeletonStats, SkeletonStatsDark, SkeletonTable, SkeletonCard } from "@/components/SkeletonLoader";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { containerVariants } from "@/animations";
import Tabs, { type TabDefinition } from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import KpiPill from "@/components/UI/KpiPill";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import KpiSection from "./components/KpiSection";
import DistributionChart from "./components/DistributionChart";
import StatusFunnelSection from "./components/StatusFunnelSection";
import FinancialOverviewSection from "./components/FinancialOverviewSection";
import PipelineHealthSection from "./components/PipelineHealthSection";
import CashFlowSection from "./components/CashFlowSection";
import InsightsSection from "./components/InsightsSection";
import AuditLogSection from "./components/AuditLogSection";
import MasterTableSection from "./components/MasterTableSection";

type PresidenciaTabKey = "estadisticas" | "auditoria" | "master";

/** Tres puntos con opacidad escalonada — evita el parpadeo en bloque de un solo `animate-pulse`. */
function AnimatedEllipsis() {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

/** Estado de conexión con el backend — spinner + "..." mientras conecta, pulso discreto cuando ya sincronizó.
 * Anima con AnimatePresence al cambiar entre ambos estados (crossfade + pop), en vez de saltar en seco. */
function ConnectionStatusBadge({ isExact }: { isExact: boolean }) {
  const warning = SEMANTIC_COLOR_MAP.warning;
  const success = SEMANTIC_COLOR_MAP.success;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!isExact ? (
        <motion.span
          key="connecting"
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 4 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold rounded-full px-3 py-1.5 border ${warning.text700} ${warning.bg50} ${warning.border200}`}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Conectando con el servidor
          <AnimatedEllipsis />
        </motion.span>
      ) : (
        <motion.span
          key="live"
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 4 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold rounded-full px-3 py-1.5 border ${success.text700} ${success.bg50} ${success.border100}`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          Sincronizado
        </motion.span>
      )}
    </AnimatePresence>
  );
}

interface PresidenciaDashboardProps {
  projects: Project[];
  auditLogs: AuditLog[];
  /** Requerido por la tab Auditoría: trae su propio historial paginado/filtrado server-side (useAuditLogs), independiente del `auditLogs` de arriba. */
  authToken: string;
  onSelectProject: (project: Project) => void;
  /** Refresca proyectos + auditoría desde el backend — opcional: sin esto, las tablas no muestran el botón de refresco. */
  onRefreshData?: () => Promise<void> | void;
  isLoading?: boolean;
}

export default function PresidenciaDashboard({
  projects,
  auditLogs,
  authToken,
  onSelectProject,
  onRefreshData,
  isLoading = false,
}: PresidenciaDashboardProps) {
  // Resumen ejecutivo: endpoint oficial con fallback a cálculo cliente.
  const { summary, isExact, lastSync } = useDashboardSummary(projects, authToken);
  const [activeTab, setActiveTab] = useState<PresidenciaTabKey>("estadisticas");

  const tabs: TabDefinition[] = [
    { key: "estadisticas", label: "Estadísticas" },
    { key: "auditoria", label: "Auditoría", count: auditLogs.length },
    { key: "master", label: "Master de Obras", count: projects.length },
  ];

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

  // La página entera scrollea en flujo normal (tabs y KPI pills incluidos —
  // no van fijos/pinneados: deben desplazarse con el resto del contenido,
  // como cualquier otra vista). Solo Auditoría y Master de Obras, que usan
  // Table fillViewport, necesitan un panel con altura acotada propia para
  // que la tabla scrollee internamente — ese panel se define más abajo,
  // scopeado a esa pestaña, sin forzar la página completa a una altura fija.
  return (
    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Presidencia</h1>

      <Tabs tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as PresidenciaTabKey)} ariaLabel="Secciones de Presidencia" layoutId="presidencia-tabs" fullWidth />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <KpiPill icon={<Layers className="h-3.5 w-3.5" />} label="Obras" value={totalProjectsCount} accent="brand" tooltip="Total de obras registradas en el sistema, en cualquier estado del flujo." />
          <KpiPill icon={<DollarSign className="h-3.5 w-3.5" />} label="Aprobado" value={`$${totalApprovedInvestment.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} accent="brand" tooltip="Inversión total aprobada en todos los proyectos." />
          <KpiPill icon={<Wallet className="h-3.5 w-3.5" />} label="Liquidado" value={`$${totalReleasedFunds.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} accent="success" tooltip="Monto efectivamente pagado a contratistas." />
          <KpiPill icon={<Activity className="h-3.5 w-3.5" />} label="Auditoría" value={auditLogs.length} accent="info" tooltip="Registros de trazabilidad disponibles en el historial." />
        </div>

        <div className="flex ml-auto">
          <ConnectionStatusBadge isExact={isExact} />
        </div>
      </div>

      <TabPanel activeKey={activeTab}>
        {activeTab === "estadisticas" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <KpiSection
              summary={summary}
              projects={projects}
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
          </motion.div>
        )}

        {activeTab === "auditoria" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col min-h-0"
            style={{ height: "calc(100vh - 14rem)" }}
          >
            <AuditLogSection authToken={authToken} />
          </motion.div>
        )}

        {activeTab === "master" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col min-h-0"
            style={{ height: "calc(100vh - 14rem)" }}
          >
            <MasterTableSection projects={projects} onSelectProject={onSelectProject} onRefresh={onRefreshData} lastUpdated={lastSync} />
          </motion.div>
        )}
      </TabPanel>
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
