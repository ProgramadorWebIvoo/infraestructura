/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Procura: aprobación de inversión inicial + evaluación comparativa.
 *
 * Dos vistas distintas por tabs (no lado a lado en un grid) — cada una es un
 * flujo de trabajo independiente con su propio ritmo (autorizar es rápido y
 * frecuente; evaluar cuadros comparativos es denso y ocasional), y compartir
 * columna las obligaba a competir por el mismo ancho. Mismo patrón que
 * InfraestructuraMantenimientoPanel (Tabs + TabPanel + altura real de
 * viewport para que el contenido de cada tab pueda ocupar toda la pantalla
 * disponible con su propio scroll interno).
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Handshake, Scale, TrendingUp } from "lucide-react";
import type { Project } from "../../types";
import { ProjectStatus } from "../../types";
import { SkeletonCard, SkeletonTable, SkeletonBlock } from "../../components/SkeletonLoader";
import { containerVariants, itemVariants } from "../../animations";
import KpiPill from "../../components/UI/KpiPill";
import Tabs from "../../components/UI/Tabs";
import TabPanel from "../../components/UI/TabPanel";
import InvestmentApprovalSection from "./components/InvestmentApprovalSection";
import BidEvaluationSection from "./components/BidEvaluationSection";

type TabKey = "autorizacion" | "comparativa";

interface ProcuraPanelProps {
  projects: Project[];
  onApproveInvestment: (projectId: string, notes: string, approvedAmount: number) => void;
  onSelectContractor: (projectId: string, contractorCode: string, proposalId: string) => Promise<void>;
  onRejectProposals: (projectId: string, reason: string) => void;
  authToken: string;
  isLoading?: boolean;
}

export default function ProcuraPanel({
  projects,
  onApproveInvestment,
  onSelectContractor,
  onRejectProposals,
  authToken,
  isLoading = false,
}: ProcuraPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("autorizacion");

  const kpis = useMemo(
    () => ({
      pendingApproval: projects.filter((p) => p.status === ProjectStatus.REVISADO_CIERRE).length,
      inBidding: projects.filter((p) => p.status === ProjectStatus.CONFIRMADO_PROCURA).length,
      comparative: projects.filter((p) => p.status === ProjectStatus.COMPARATIVA_ENVIADA).length,
      contracted: projects.filter((p) => p.status === ProjectStatus.CONTRATADO).length,
    }),
    [projects],
  );

  if (isLoading) return <ProcuraSkeleton />;

  return (
    <motion.div className="flex min-h-0 flex-col gap-4" style={{ height: "calc(100vh - 3rem)" }} variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Procura</h1>

      {/* Tabs primero — barra de navegación principal de la vista, igual
          criterio que InfraestructuraMantenimientoPanel. */}
      <motion.div variants={itemVariants} className="shrink-0">
        <Tabs
          ariaLabel="Secciones de Procura"
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          fullWidth
          tabs={[
            { key: "autorizacion", label: "Autorización de Inversión", count: kpis.pendingApproval },
            { key: "comparativa", label: "Evaluación Comparativa", count: kpis.comparative },
          ]}
        />
      </motion.div>

      {/* KPIs operativos del departamento — contexto secundario compacto
          debajo de las tabs (mismo patrón que Infraestructura/Cierre de
          Obra), no cards grandes compitiendo por atención con las tabs. */}
      <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap gap-2">
        <KpiPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Por Autorizar" value={kpis.pendingApproval} accent="brand" />
        <KpiPill icon={<ClipboardList className="h-3.5 w-3.5" />} label="En Licitación" value={kpis.inBidding} accent="info" />
        <KpiPill icon={<Scale className="h-3.5 w-3.5" />} label="Comparativa" value={kpis.comparative} accent="success" />
        <KpiPill icon={<Handshake className="h-3.5 w-3.5" />} label="Contratados" value={kpis.contracted} accent="neutral" />
      </motion.div>

      <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
        <TabPanel activeKey={activeTab}>
          {activeTab === "autorizacion" && (
            <InvestmentApprovalSection
              projects={projects}
              authToken={authToken}
              onApproveInvestment={onApproveInvestment}
            />
          )}
          {activeTab === "comparativa" && (
            <BidEvaluationSection
              projects={projects}
              authToken={authToken}
              onSelectContractor={onSelectContractor}
              onRejectProposals={onRejectProposals}
            />
          )}
        </TabPanel>
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function ProcuraSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <SkeletonBlock className="h-11 w-56 rounded-2xl" />
        <SkeletonBlock className="h-11 w-56 rounded-2xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
      </div>
      <SkeletonCard />
      <SkeletonTable rows={3} columns={7} />
    </div>
  );
}
