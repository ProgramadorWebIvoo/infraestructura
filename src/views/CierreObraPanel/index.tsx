/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Cierre de Obra: revisión de cálculos/planos + auditoría de fin de obra.
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { Clock, HardHat, ShieldCheck } from "lucide-react";
import type { Project } from "../../types";
import { ProjectStatus } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonList, SkeletonBlock, SkeletonStats } from "../../components/SkeletonLoader";
import KpiCard from "../../components/UI/KpiCard";
import TechnicalReviewSection from "./components/TechnicalReviewSection";
import CompletionAuditSection from "./components/CompletionAuditSection";
import ReturnsFlowStrip from "./components/ReturnsFlowStrip";
import RevisedDocumentsSection from "./components/RevisedDocumentsSection";

interface CierreObraPanelProps {
  projects: Project[];
  authToken: string;
  onReviewProject: (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => void;
  onRejectProject: (projectId: string, reason: string) => void;
  onVerifyCompletion: (projectId: string) => void;
  onUploadDocumentVersion: (
    projectId: string,
    documentId: number,
    documentType: "PLANO" | "CALC" | "FOTO",
    file: File,
  ) => void;
  isLoading?: boolean;
}

export default function CierreObraPanel({
  projects,
  authToken,
  onReviewProject,
  onRejectProject,
  onVerifyCompletion,
  onUploadDocumentVersion,
  isLoading = false,
}: CierreObraPanelProps) {
  if (isLoading) return <CierreObraSkeleton />;

  const kpis = useMemo(
    () => ({
      pendingReview: projects.filter((p) => p.status === ProjectStatus.CREADO).length,
      inExecution: projects.filter((p) => p.status === ProjectStatus.EN_EJECUCION).length,
      underAudit: projects.filter((p) => p.status === ProjectStatus.VERIFICANDO_FINALIZACION).length,
    }),
    [projects],
  );

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Cierre de Obra</h1>

      {/* Header del departamento */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl shadow-sm">
            <HardHat className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Cierre de Obra</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Valide cálculos y planos, supervise la ejecución y certifique la calidad de la entrega.
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs operativos del departamento */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={<Clock className="h-5 w-5" />} label="Por Revisar" accent="text-sky-600" borderAccent="border-l-sky-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{kpis.pendingReview}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Cálculos y planos en cola</p>
        </KpiCard>

        <KpiCard icon={<HardHat className="h-5 w-5" />} label="En Ejecución" accent="text-cyan-600" borderAccent="border-l-cyan-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-cyan-700 to-cyan-500 bg-clip-text text-transparent">{kpis.inExecution}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Obras activas en campo</p>
        </KpiCard>

        <KpiCard icon={<ShieldCheck className="h-5 w-5" />} label="Auditoría" accent="text-amber-600" borderAccent="border-l-amber-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">{kpis.underAudit}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Esperando certificación</p>
        </KpiCard>
      </motion.div>

      {/* Fila informativa: flujo de retornos */}
      <motion.div variants={itemVariants}>
        <ReturnsFlowStrip />
      </motion.div>

      {/* SECTION 1: Pending Technical Reviews */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <TechnicalReviewSection projects={projects} onReviewProject={onReviewProject} onRejectProject={onRejectProject} />
        </div>

        {/* SECTION 2: Work Completion & Quality Verification */}
        <div className="lg:col-span-5 space-y-6">
          <CompletionAuditSection projects={projects} onVerifyCompletion={onVerifyCompletion} />
        </div>
      </motion.div>

      {/* SECTION 3: Revised documents (versioning + preview) */}
      <motion.div variants={itemVariants}>
        <RevisedDocumentsSection
          projects={projects}
          authToken={authToken}
          onUploadDocumentVersion={onUploadDocumentVersion}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function CierreObraSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <SkeletonBlock className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-56" />
          <SkeletonBlock className="h-3 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStats key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <SkeletonCard />
          <SkeletonList items={3} />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <SkeletonCard />
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
