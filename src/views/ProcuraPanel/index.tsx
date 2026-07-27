/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Procura: aprobación de inversión inicial + evaluación comparativa.
 */

import { motion } from "motion/react";
import type { Project } from "../../types";
import { SkeletonCard, SkeletonTable } from "../../components/SkeletonLoader";
import { containerVariants, itemVariants } from "../../animations";
import InvestmentApprovalSection from "./InvestmentApprovalSection";
import BidEvaluationSection from "./BidEvaluationSection";

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
  if (isLoading) return <ProcuraSkeleton />;

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Procura</h1>

      <motion.div variants={itemVariants}>
        <InvestmentApprovalSection
          projects={projects}
          authToken={authToken}
          onApproveInvestment={onApproveInvestment}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <BidEvaluationSection
          projects={projects}
          authToken={authToken}
          onSelectContractor={onSelectContractor}
          onRejectProposals={onRejectProposals}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function ProcuraSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard />
      <SkeletonTable rows={3} columns={7} />
    </div>
  );
}
