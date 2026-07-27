/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Cierre de Obra: revisión de cálculos/planos + auditoría de fin de obra.
 */

import { motion } from "motion/react";
import type { Project } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonList, SkeletonBlock } from "../../components/SkeletonLoader";
import TechnicalReviewSection from "./TechnicalReviewSection";
import CompletionAuditSection from "./CompletionAuditSection";

interface CierreObraPanelProps {
  projects: Project[];
  onReviewProject: (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => void;
  onVerifyCompletion: (projectId: string) => void;
  isLoading?: boolean;
}

export default function CierreObraPanel({
  projects,
  onReviewProject,
  onVerifyCompletion,
  isLoading = false,
}: CierreObraPanelProps) {
  if (isLoading) return <CierreObraSkeleton />;

  return (
    <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* SECTION 1: Pending Technical Reviews */}
      <motion.div variants={itemVariants} className="lg:col-span-7 space-y-6">
        <h1 className="sr-only">Cierre de Obra</h1>
        <TechnicalReviewSection projects={projects} onReviewProject={onReviewProject} />
      </motion.div>

      {/* SECTION 2: Work Completion & Quality Verification */}
      <motion.div variants={itemVariants} className="lg:col-span-5 space-y-6">
        <CompletionAuditSection projects={projects} onVerifyCompletion={onVerifyCompletion} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function CierreObraSkeleton() {
  return (
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
  );
}
