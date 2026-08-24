/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Cierre de Obra: revisión de cálculos/planos + auditoría de fin de obra.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock, FileStack, HardHat, ShieldCheck } from "lucide-react";
import type { Project } from "../../types";
import { ProjectStatus } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonList, SkeletonBlock, SkeletonGroup, SkeletonGroupItem } from "../../components/SkeletonLoader";
import KpiPill from "../../components/UI/KpiPill";
import Tabs from "../../components/UI/Tabs";
import TabPanel from "../../components/UI/TabPanel";
import InfoBanner from "../../components/UI/InfoBanner";
import TechnicalReviewSection from "./components/TechnicalReviewSection";
import CompletionAuditSection from "./components/CompletionAuditSection";
import RevisedDocumentsSection from "./components/RevisedDocumentsSection";

type TabKey = "revision" | "auditoria" | "documentos";

interface CierreObraPanelProps {
  projects: Project[];
  authToken: string;
  onReviewProject: (projectId: string, notes: string) => void;
  onRejectProject: (
    projectId: string,
    reason: string,
    observations?: string,
    correctionFiles?: File[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onVerifyCompletion: (projectId: string) => void;
  onSyncProject: (project: Project) => void;
  isLoading?: boolean;
}

export default function CierreObraPanel({
  projects,
  authToken,
  onReviewProject,
  onRejectProject,
  onVerifyCompletion,
  onSyncProject,
  isLoading = false,
}: CierreObraPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("revision");

  const kpis = useMemo(
    () => ({
      pendingReview: projects.filter((p) => p.status === ProjectStatus.CREADO).length,
      inExecution: projects.filter((p) => p.status === ProjectStatus.EN_EJECUCION).length,
      underAudit: projects.filter((p) => p.status === ProjectStatus.VERIFICANDO_FINALIZACION).length,
      revised: projects.filter((p) => p.status !== ProjectStatus.CREADO).length,
    }),
    [projects],
  );

  if (isLoading) return <CierreObraSkeleton />;

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Cierre de Obra</h1>

      {/* Columna a alto de viewport, igual que InfraestructuraMantenimientoPanel:
          las tabs/KPIs son shrink-0 y el panel de tab activa es flex-1. Height
          real (no maxHeight) porque las tabs internas pueden usar Table
          fillViewport. */}
      <div className="flex min-h-0 flex-col gap-4" style={{ height: "calc(100vh - 3rem)" }}>
        <motion.div variants={itemVariants} className="shrink-0">
          <Tabs
            ariaLabel="Secciones de Cierre de Obra"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            fullWidth
            tabs={[
              { key: "revision", label: "Revisión de Cálculos y Planos", count: kpis.pendingReview, showDot: kpis.pendingReview > 0 && activeTab !== "revision" },
              { key: "auditoria", label: "Auditoría de Fin de Obra", count: kpis.inExecution + kpis.underAudit },
              { key: "documentos", label: "Documentos ya Revisados", count: kpis.revised },
            ]}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap gap-2">
          <KpiPill icon={<Clock className="h-3.5 w-3.5" />} label="Por Revisar" value={kpis.pendingReview} accent="info" />
          <KpiPill icon={<HardHat className="h-3.5 w-3.5" />} label="En Ejecución" value={kpis.inExecution} accent="brand" />
          <KpiPill icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Auditoría" value={kpis.underAudit} accent="warning" />
          <KpiPill icon={<FileStack className="h-3.5 w-3.5" />} label="Revisados" value={kpis.revised} accent="success" />
        </motion.div>

        <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
          <TabPanel activeKey={activeTab}>
            {activeTab === "revision" && (
              <div className="min-h-0 flex flex-col flex-1 gap-6">
                <InfoBanner title="Flujo de Retornos · De acuerdo con los procedimientos operativos de IVOO" color="sky" className="shrink-0">
                  <ol className="space-y-1.5 list-none">
                    <li><strong className="text-sky-900">1.</strong> Cierre de Obra realiza la cubicación de materiales y planos de ingeniería iniciales.</li>
                    <li><strong className="text-sky-900">2.</strong> Al finalizar el trabajo, audita físicamente la obra y certifica si cumple con los estándares estipulados.</li>
                    <li><strong className="text-sky-900">3.</strong> Su aprobación final viaja a la Base de Datos para que <strong>Finanzas</strong> proceda con la liberación del finiquito.</li>
                  </ol>
                </InfoBanner>
                <div className="min-h-0 flex-1 flex flex-col">
                  <TechnicalReviewSection projects={projects} authToken={authToken} onReviewProject={onReviewProject} onRejectProject={onRejectProject} onSyncProject={onSyncProject} />
                </div>
              </div>
            )}
            {activeTab === "auditoria" && (
              <div className="min-h-0 flex flex-col flex-1">
                <CompletionAuditSection projects={projects} onVerifyCompletion={onVerifyCompletion} />
              </div>
            )}
            {activeTab === "documentos" && (
              <div className="min-h-0 flex flex-col flex-1">
                <RevisedDocumentsSection
                  projects={projects}
                  authToken={authToken}
                />
              </div>
            )}
          </TabPanel>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function CierreObraSkeleton() {
  return (
    <SkeletonGroup className="space-y-4">
      <SkeletonGroupItem>
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
      </SkeletonGroupItem>
      <SkeletonGroupItem className="flex gap-2">
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
      </SkeletonGroupItem>
      <SkeletonGroupItem className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <SkeletonCard />
          <SkeletonList items={3} />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <SkeletonCard />
        </div>
      </SkeletonGroupItem>
    </SkeletonGroup>
  );
}
