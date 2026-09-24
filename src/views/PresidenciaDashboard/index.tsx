/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, DollarSign, FileDown, FileSignature, Layers, Loader2, Wallet } from "lucide-react";
import { ProjectStatus } from "@/types";
import type { Project, AuditLog } from "@/types";
import { SkeletonStats, SkeletonStatsDark, SkeletonTable, SkeletonCard } from "@/components/SkeletonLoader";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { containerVariants } from "@/animations";
import Tabs, { type TabDefinition } from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import KpiPill from "@/components/UI/KpiPill";
import Button from "@/components/UI/Button";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { printExecutiveReport } from "@/utils/executiveReportPdf";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";
import KpiSection from "./components/KpiSection";
import DistributionChart from "./components/DistributionChart";
import StatusFunnelSection from "./components/StatusFunnelSection";
import FinancialOverviewSection from "./components/FinancialOverviewSection";
import PipelineHealthSection from "./components/PipelineHealthSection";
import CashFlowSection from "./components/CashFlowSection";
import StalledProjectsSection from "./components/StalledProjectsSection";
import InsightsSection from "./components/InsightsSection";
import AuditLogSection from "./components/AuditLogSection";
import ProjectHistorySection from "./components/ProjectHistorySection";

type PresidenciaTabKey = "estadisticas" | "historico" | "auditoria";

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
  isLoading?: boolean;
}

export default function PresidenciaDashboard({
  projects,
  auditLogs,
  authToken,
  isLoading = false,
}: PresidenciaDashboardProps) {
  // Resumen ejecutivo: endpoint oficial con fallback a cálculo cliente.
  const { summary, isExact } = useDashboardSummary(projects, authToken);
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();
  const [activeTab, setActiveTab] = useState<PresidenciaTabKey>("estadisticas");
  const [historyProjectId, setHistoryProjectId] = useState<string | null>(null);

  /** Cualquier acceso a "inspeccionar una obra" (ej. obras estancadas) abre su detalle en el Histórico. */
  const openProjectHistory = useCallback((project: Project) => {
    setActiveTab("historico");
    setHistoryProjectId(project.id);
  }, []);

  const tabs: TabDefinition[] = [
    { key: "estadisticas", label: "Estadísticas" },
    { key: "historico", label: "Histórico de Obras" },
    { key: "auditoria", label: "Auditoría", count: auditLogs.length },
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
  const totalCommittedAmount = summary.totalCommittedAmount;
  const pendingFunds = summary.pendingFunds;
  const releasedPercent = Math.min(100, summary.releasedPercent);
  const excessReleased = summary.excessReleased;

  if (isLoading) return <PresidenciaSkeleton />;

  // La página entera scrollea en flujo normal (tabs y KPI pills incluidos —
  // no van fijos/pinneados: deben desplazarse con el resto del contenido,
  // como cualquier otra vista).
  return (
    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Presidencia</h1>

      <Tabs tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as PresidenciaTabKey)} ariaLabel="Secciones de Presidencia" layoutId="presidencia-tabs" fullWidth />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <KpiPill icon={<Layers className="h-3.5 w-3.5" />} label="Obras" value={totalProjectsCount} accent="brand" tooltip="Total de obras registradas en el sistema, en cualquier estado del flujo." />
          <KpiPill
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="Aprobado"
            value={`$${totalApprovedInvestment.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            accent="brand"
            tooltip={
              <>
                Inversión total aprobada en todos los proyectos.
                <BsAmount amount={totalApprovedInvestment} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="block" className="text-slate-300 mt-1" />
              </>
            }
          />
          <KpiPill
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Liquidado"
            value={`$${totalReleasedFunds.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            accent="success"
            tooltip={
              <>
                Monto efectivamente pagado a contratistas.
                <BsAmount amount={totalReleasedFunds} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="block" className="text-slate-300 mt-1" />
              </>
            }
          />
          <KpiPill
            icon={<FileSignature className="h-3.5 w-3.5" />}
            label="Comprometido"
            value={`$${totalCommittedAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            accent="warning"
            tooltip={
              <>
                Monto adjudicado en contratos firmados (contratado, en ejecución o verificando finalización) aún no liquidado.
                <BsAmount amount={totalCommittedAmount} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="block" className="text-slate-300 mt-1" />
              </>
            }
          />
          <KpiPill icon={<Activity className="h-3.5 w-3.5" />} label="Auditoría" value={auditLogs.length} accent="info" tooltip="Registros de trazabilidad disponibles en el historial." />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            colorScheme="slate"
            variant="secondary"
            icon={<FileDown className="h-3.5 w-3.5" />}
            onClick={() => printExecutiveReport({ summary, projects, auditLogsCount: auditLogs.length, isExact })}
          >
            Reporte Ejecutivo (PDF)
          </Button>
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

            <StalledProjectsSection stalledProjects={summary.stalledProjects} projects={projects} onSelectProject={openProjectHistory} />

            <InsightsSection summary={summary} />
          </motion.div>
        )}

        {activeTab === "historico" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <ProjectHistorySection authToken={authToken} projects={projects} selectedId={historyProjectId} onSelect={setHistoryProjectId} />
          </motion.div>
        )}

        {activeTab === "auditoria" && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <AuditLogSection authToken={authToken} />
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
