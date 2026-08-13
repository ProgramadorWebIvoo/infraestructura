/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, FileSearch, Handshake, Send } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project, Contractor, Proposal } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonList, SkeletonBlock, SkeletonStats } from "../../components/SkeletonLoader";
import KpiCard from "../../components/UI/KpiCard";
import BidRegistrationSection from "./components/BidRegistrationSection";
import ComparativeTableSection from "./components/ComparativeTableSection";

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

  const pendingLicitacion = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CONFIRMADO_PROCURA),
    [projects],
  );
  const activeProject = pendingLicitacion.find(p => p.id === selectedProjectId);

  const kpis = useMemo(
    () => ({
      inBidding: pendingLicitacion.length,
      withProposals: pendingLicitacion.filter(p => (p.proposals?.length ?? 0) > 0).length,
      comparativeSent: projects.filter(p => p.status === ProjectStatus.COMPARATIVA_ENVIADA).length,
      contracted: projects.filter(p => p.status === ProjectStatus.CONTRATADO).length,
    }),
    [projects, pendingLicitacion],
  );

  if (isLoading) return <AnalistasSkeleton />;

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Analistas</h1>

      {/* Header del departamento */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
            <FileSearch className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Analistas</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Registre ofertas de contratistas y consolide cuadros comparativos por expediente.
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs operativos del departamento */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<ClipboardList className="h-5 w-5" />} label="En Licitación" accent="text-emerald-600" borderAccent="border-l-emerald-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">{kpis.inBidding}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Expedientes a cotizar</p>
        </KpiCard>

        <KpiCard icon={<FileSearch className="h-5 w-5" />} label="Con Propuestas" accent="text-sky-600" borderAccent="border-l-sky-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{kpis.withProposals}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Con ofertas registradas</p>
        </KpiCard>

        <KpiCard icon={<Send className="h-5 w-5" />} label="Cuadros Enviados" accent="text-purple-600" borderAccent="border-l-purple-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent">{kpis.comparativeSent}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">En revisión de Procura</p>
        </KpiCard>

        <KpiCard icon={<Handshake className="h-5 w-5" />} label="Contratados" accent="text-indigo-600" borderAccent="border-l-indigo-400">
          <span className="text-2xl font-black font-mono bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">{kpis.contracted}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Adjudicaciones cerradas</p>
        </KpiCard>
      </motion.div>

      {/* Left panel: Active Licitations and Adder */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <BidRegistrationSection
            pendingLicitacion={pendingLicitacion}
            contractors={contractors}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            activeProject={activeProject}
            onAddProposal={onAddProposal}
          />
        </div>

        {/* Right panel: Comparative Table Preview & Submission */}
        <div className="lg:col-span-5 space-y-6">
          <ComparativeTableSection
            activeProject={activeProject}
            onRemoveProposal={onRemoveProposal}
            onSubmitComparative={onSubmitComparative}
            onImportSupplierProposals={onImportSupplierProposals}
            onComparativeSubmitted={() => setSelectedProjectId("")}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function AnalistasSkeleton() {
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
    </div>
  );
}