/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Finanzas: liberación de anticipos + liquidaciones finales + diario de egresos.
 */

import { motion } from "motion/react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import { SkeletonCard, SkeletonTable } from "../../components/SkeletonLoader";
import { containerVariants, itemVariants } from "../../animations";
import AdvancesSection from "./AdvancesSection";
import FinalSettlementsSection from "./FinalSettlementsSection";
import LedgerSection from "./LedgerSection";

interface FinanzasPanelProps {
  projects: Project[];
  onPayAdvance: (projectId: string, amount: number) => void;
  onPayFinal: (projectId: string, amount: number) => void;
  isLoading?: boolean;
}

export default function FinanzasPanel({
  projects,
  onPayAdvance,
  onPayFinal,
  isLoading = false,
}: FinanzasPanelProps) {
  if (isLoading) return <FinanzasSkeleton />;

  const pendingAdvances = projects.filter(p => p.status === ProjectStatus.CONTRATADO);
  const pendingFinalPayments = projects.filter(p => p.status === ProjectStatus.LISTO_PAGO_FINAL);

  // Completed transactions ledger
  const paidLedger: {
    id: string;
    projectId: string;
    title: string;
    contractorCode: string;
    type: "ANTICIPO" | "LIQUIDACIÓN_FINAL";
    amount: number;
    date: string;
    voucher: string;
  }[] = [];

  projects.forEach((p, idx) => {
    const winner = p.proposals?.find(pr => pr.contractorCode === p.selectedContractorCode);
    const contractor = winner ? winner.contractorCode : "CON-301";

    if (p.advancePaidAmount && p.advancePaidDate) {
      paidLedger.push({
        id: `TXN-ADV-${idx}-${p.id}`,
        projectId: p.id,
        title: p.title,
        contractorCode: contractor,
        type: "ANTICIPO",
        amount: p.advancePaidAmount,
        date: p.advancePaidDate,
        voucher: `VCH-${1000 + idx}A`,
      });
    }
    if (p.finalPaidAmount && p.finalPaidDate) {
      paidLedger.push({
        id: `TXN-FIN-${idx}-${p.id}`,
        projectId: p.id,
        title: p.title,
        contractorCode: contractor,
        type: "LIQUIDACIÓN_FINAL",
        amount: p.finalPaidAmount,
        date: p.finalPaidDate,
        voucher: `VCH-${1000 + idx}F`,
      });
    }
  });
  paidLedger.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      <h1 className="sr-only">Finanzas</h1>

      {/* 2 Column Operations */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdvancesSection pendingAdvances={pendingAdvances} onPayAdvance={onPayAdvance} />
        <FinalSettlementsSection pendingFinalPayments={pendingFinalPayments} onPayFinal={onPayFinal} />
      </motion.div>

      {/* Financial ledger */}
      <motion.div variants={itemVariants}>
        <LedgerSection paidLedger={paidLedger} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function FinanzasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={4} columns={6} />
    </div>
  );
}
