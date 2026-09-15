/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Finanzas: diario de egresos + ejecución financiera del
 * portafolio + liberación de anticipos + liquidaciones finales,
 * organizados por tabs — mismo patrón que Procura/Infraestructura (Tabs +
 * KpiPill de contexto compacto debajo + TabPanel con scroll interno propio
 * por sección), en vez de apilar las 4 secciones en un solo scroll largo.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { BookText, CheckCircle2, Hourglass, Wallet } from "lucide-react";
import { ProjectStatus, type Project } from "@/types";
import { SkeletonCard, SkeletonTable, SkeletonBlock } from "@/components/SkeletonLoader";
import { containerVariants, itemVariants } from "@/animations";
import KpiPill from "@/components/UI/KpiPill";
import Tabs from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import FinancialSummarySection from "./components/FinancialSummarySection";
import AdvancesSection from "./components/AdvancesSection";
import FinalSettlementsSection from "./components/FinalSettlementsSection";
import LedgerSection, { type LedgerEntry } from "./components/LedgerSection";
import { useTabAccess, useSyncActiveTab } from "@/hooks/useTabAccess";

type TabKey = "book" | "stats" | "advances" | "settlements";

interface FinanzasPanelProps {
  projects: Project[];
  /** Opcional con default "" — solo se usa para resolver tabs dinámicas (GET /auth/tabs); sin token, todas las tabs quedan visibles. */
  authToken?: string;
  onPayAdvance: (projectId: string, amount: number, proofFile: File) => Promise<void>;
  onPayFinal: (projectId: string, amount: number, proofFile: File) => Promise<void>;
  isLoading?: boolean;
}

export default function FinanzasPanel({ projects, authToken = "", onPayAdvance, onPayFinal, isLoading = false }: FinanzasPanelProps) {
  const { filterTabs, isLoadingTabs } = useTabAccess(authToken);
  const [activeTab, setActiveTab] = useState<TabKey>("stats");

  const pendingAdvances = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CONTRATADO),
    [projects],
  );
  const pendingFinalPayments = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.LISTO_PAGO_FINAL),
    [projects],
  );

  const kpis = useMemo(
    () => ({
      pendingAdvances: pendingAdvances.length,
      pendingFinal: pendingFinalPayments.length,
      inExecution: projects.filter(
        p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION,
      ).length,
      completed: projects.filter(p => p.status === ProjectStatus.COMPLETADO_PAGADO).length,
    }),
    [projects, pendingAdvances, pendingFinalPayments],
  );

  // Diario de egresos: reconstruido a partir de los pagos ya registrados en
  // cada proyecto (advancePaidAmount/finalPaidAmount), sin necesitar una
  // tabla de transacciones propia en el backend.
  const paidLedger = useMemo<LedgerEntry[]>(() => {
    const entries: LedgerEntry[] = [];

    for (const p of projects) {
      const winner = p.proposals?.find(pr => pr.contractorCode === p.selectedContractorCode);
      const contractorCode = winner?.contractorCode ?? p.selectedContractorCode ?? "—";

      if (p.advancePaidAmount && p.advancePaidDate) {
        entries.push({
          id: `TXN-ADV-${p.id}`,
          projectId: p.id,
          title: p.title,
          contractorCode,
          type: "ANTICIPO",
          amount: p.advancePaidAmount,
          date: p.advancePaidDate,
          voucher: `VCH-${p.id}-A`,
        });
      }
      if (p.finalPaidAmount && p.finalPaidDate) {
        entries.push({
          id: `TXN-FIN-${p.id}`,
          projectId: p.id,
          title: p.title,
          contractorCode,
          type: "LIQUIDACIÓN_FINAL",
          amount: p.finalPaidAmount,
          date: p.finalPaidDate,
          voucher: `VCH-${p.id}-F`,
        });
      }
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [projects]);

  const visibleTabs = filterTabs("/finanzas", [
    { key: "stats", label: "Estadisticas" },
    { key: "book", label: "Diario de Egresos", count: paidLedger.length },
    { key: "advances", label: "Anticipos", count: kpis.pendingAdvances },
    { key: "settlements", label: "Finiquitos", count: kpis.pendingFinal },
  ]);
  useSyncActiveTab(visibleTabs, activeTab, setActiveTab);

  if (isLoading || isLoadingTabs) return <FinanzasSkeleton />;

  return (
    <motion.div className="flex min-h-0 flex-col gap-4" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Finanzas</h1>

      {/* Tabs primero — barra de navegación principal, mismo criterio que
          Procura/Infraestructura. */}
      <motion.div variants={itemVariants} className="shrink-0">
        <Tabs
          ariaLabel="Secciones de Finanzas"
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          fullWidth
          tabs={visibleTabs}
        />
      </motion.div>

      {/* KPIs operativos del departamento — contexto secundario compacto
          debajo de las tabs, no cards grandes compitiendo por atención. */}
      <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap gap-2">
        <KpiPill icon={<Wallet className="h-3.5 w-3.5" />} label="Anticipos por Liberar" value={kpis.pendingAdvances} accent="danger" tooltip="Proyectos contratados cuyo anticipo pactado aún no fue liberado al proveedor." />
        <KpiPill icon={<BookText className="h-3.5 w-3.5" />} label="Finiquitos por Liquidar" value={kpis.pendingFinal} accent="info" tooltip="Proyectos listos para pago final, pendientes de liquidar el finiquito." />
        <KpiPill icon={<Hourglass className="h-3.5 w-3.5" />} label="En Ejecución" value={kpis.inExecution} accent="warning" tooltip="Proyectos en obra con pagos parciales ya en curso." />
        <KpiPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Obras Completadas" value={kpis.completed} accent="success" tooltip="Proyectos con todos sus pagos completados y liquidados." />
      </motion.div>

      <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
        <TabPanel activeKey={activeTab}>
          {activeTab === "book" && <LedgerSection paidLedger={paidLedger} />}
          {activeTab === "stats" && <FinancialSummarySection projects={projects} paidLedger={paidLedger} />}
          {activeTab === "advances" && <AdvancesSection pendingAdvances={pendingAdvances} onPayAdvance={onPayAdvance} />}
          {activeTab === "settlements" && <FinalSettlementsSection pendingFinalPayments={pendingFinalPayments} onPayFinal={onPayFinal} />}
        </TabPanel>
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function FinanzasSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <SkeletonBlock className="h-11 w-44 rounded-2xl" />
        <SkeletonBlock className="h-11 w-44 rounded-2xl" />
        <SkeletonBlock className="h-11 w-44 rounded-2xl" />
        <SkeletonBlock className="h-11 w-44 rounded-2xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-36 rounded-full" />
        <SkeletonBlock className="h-8 w-36 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-36 rounded-full" />
      </div>
      <SkeletonCard />
      <SkeletonTable rows={4} columns={6} />
    </div>
  );
}
