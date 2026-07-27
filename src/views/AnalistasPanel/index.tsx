/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { ProjectStatus } from "../../types";
import type { Project, Contractor, Proposal } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonList, SkeletonBlock } from "../../components/SkeletonLoader";
import BidRegistrationSection from "./BidRegistrationSection";
import ComparativeTableSection from "./ComparativeTableSection";

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
}

interface AnalistasPanelProps {
  projects: Project[];
  contractors: Contractor[];
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  isLoading?: boolean;
}

export default function AnalistasPanel({
  projects,
  contractors,
  onAddProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  isLoading = false,
}: AnalistasPanelProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("");

  if (isLoading) return <AnalistasSkeleton />;

  const pendingLicitacion = projects.filter(p => p.status === ProjectStatus.CONFIRMADO_PROCURA);
  const activeProject = pendingLicitacion.find(p => p.id === selectedProjectId);

  return (
    <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* Left panel: Active Licitations and Adder */}
      <motion.div variants={itemVariants} className="lg:col-span-7 space-y-6">
        <h1 className="sr-only">Analistas</h1>
        <BidRegistrationSection
          pendingLicitacion={pendingLicitacion}
          contractors={contractors}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          activeProject={activeProject}
          onAddProposal={onAddProposal}
        />
      </motion.div>

      {/* Right panel: Comparative Table Preview & Submission */}
      <motion.div variants={itemVariants} className="lg:col-span-5 space-y-6">
        <ComparativeTableSection
          activeProject={activeProject}
          onRemoveProposal={onRemoveProposal}
          onSubmitComparative={onSubmitComparative}
          onImportSupplierProposals={onImportSupplierProposals}
          onComparativeSubmitted={() => setSelectedProjectId("")}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function AnalistasSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        <SkeletonCard />
        <SkeletonList items={3} />
      </div>
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <SkeletonBlock className="h-5 w-5 rounded-lg" />
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <SkeletonBlock className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
