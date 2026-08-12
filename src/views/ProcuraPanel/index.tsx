/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Procura: aprobación de inversión inicial + evaluación comparativa.
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { ClipboardList, Handshake, Scale, TrendingUp } from "lucide-react";
import type { Project } from "../../types";
import { ProjectStatus } from "../../types";
import { SkeletonCard, SkeletonTable, SkeletonBlock, SkeletonStats } from "../../components/SkeletonLoader";
import { containerVariants, itemVariants } from "../../animations";
import KpiCard from "../../components/UI/KpiCard";
import InvestmentApprovalSection from "./components/InvestmentApprovalSection";
import BidEvaluationSection from "./components/BidEvaluationSection";

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

  const kpis = useMemo(
    () => ({
      pendingApproval: projects.filter((p) => p.status === ProjectStatus.REVISADO_CIERRE).length,
      inBidding: projects.filter((p) => p.status === ProjectStatus.CONFIRMADO_PROCURA).length,
      comparative: projects.filter((p) => p.status === ProjectStatus.COMPARATIVA_ENVIADA).length,
      contracted: projects.filter((p) => p.status === ProjectStatus.CONTRATADO).length,
    }),
    [projects],
  );

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Procura</h1>

      {/* Header del departamento */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl shadow-sm">
            <Handshake className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Gerencia de Procura</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Autorice inversiones, evalúe ofertas y adjudique contratos a los contratistas idóneos.
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs operativos del departamento */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Por Autorizar" accent="text-purple-600" borderAccent="border-l-purple-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent">{kpis.pendingApproval}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Inversión en cola</p>
        </KpiCard>

        <KpiCard icon={<ClipboardList className="h-5 w-5" />} label="En Licitación" accent="text-sky-600" borderAccent="border-l-sky-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{kpis.inBidding}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Esperando propuestas</p>
        </KpiCard>

        <KpiCard icon={<Scale className="h-5 w-5" />} label="Comparativa" accent="text-emerald-600" borderAccent="border-l-emerald-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">{kpis.comparative}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Cuadros por adjudicar</p>
        </KpiCard>

        <KpiCard icon={<Handshake className="h-5 w-5" />} label="Contratados" accent="text-indigo-600" borderAccent="border-l-indigo-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">{kpis.contracted}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Contratos adjudicados</p>
        </KpiCard>
      </motion.div>

      {/* Secciones: autorización (izq) + evaluación comparativa (der) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <InvestmentApprovalSection
            projects={projects}
            authToken={authToken}
            onApproveInvestment={onApproveInvestment}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <BidEvaluationSection
            projects={projects}
            authToken={authToken}
            onSelectContractor={onSelectContractor}
            onRejectProposals={onRejectProposals}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function ProcuraSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <SkeletonBlock className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-56" />
          <SkeletonBlock className="h-3 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStats key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <SkeletonCard />
        </div>
        <div className="lg:col-span-7 space-y-6">
          <SkeletonCard />
          <SkeletonTable rows={3} columns={7} />
        </div>
      </div>
    </div>
  );
}