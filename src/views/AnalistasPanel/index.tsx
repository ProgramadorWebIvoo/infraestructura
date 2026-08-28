/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { motion } from "motion/react";
import { ClipboardList, FileSearch, Handshake, Send } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project, Contractor, Proposal } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonBlock, SkeletonCard, SkeletonTable } from "../../components/SkeletonLoader";
import KpiPill from "../../components/UI/KpiPill";
import AnalistasWorkspace from "./components/AnalistasWorkspace";

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
}

type RenegotiationPayload = Omit<Proposal, "id" | "contractorCode" | "contractorName" | "contractorRating" | "origen" | "precioAnterior" | "precioNuevo" | "diferencia">;

interface AnalistasPanelProps {
  projects: Project[];
  contractors: Contractor[];
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRenegotiateProposal: (projectId: string, proposalId: string, renegotiation: RenegotiationPayload) => Promise<void>;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  authToken: string;
  isLoading?: boolean;
}

export default function AnalistasPanel({
  projects,
  contractors,
  onAddProposal,
  onRenegotiateProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  authToken,
  isLoading = false,
}: AnalistasPanelProps) {
  const pendingLicitacion = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CONFIRMADO_PROCURA),
    [projects],
  );

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
    <motion.div className="flex min-h-0 flex-col gap-4" style={{ height: "calc(100vh - 3rem)" }} variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Analistas</h1>

      {/* KPIs operativos del departamento — contexto secundario compacto,
          mismo patrón que Procura/Infraestructura/Cierre de Obra. */}
      <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap gap-2">
        <KpiPill icon={<ClipboardList className="h-3.5 w-3.5" />} label="En Licitación" value={kpis.inBidding} accent="brand" />
        <KpiPill icon={<FileSearch className="h-3.5 w-3.5" />} label="Con Propuestas" value={kpis.withProposals} accent="info" />
        <KpiPill icon={<Send className="h-3.5 w-3.5" />} label="Cuadros Enviados" value={kpis.comparativeSent} accent="success" />
        <KpiPill icon={<Handshake className="h-3.5 w-3.5" />} label="Contratados" value={kpis.contracted} accent="neutral" />
      </motion.div>

      <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
        <AnalistasWorkspace
          pendingLicitacion={pendingLicitacion}
          contractors={contractors}
          onAddProposal={onAddProposal}
          onRenegotiateProposal={onRenegotiateProposal}
          onRemoveProposal={onRemoveProposal}
          onSubmitComparative={onSubmitComparative}
          onImportSupplierProposals={onImportSupplierProposals}
          authToken={authToken}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function AnalistasSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
      </div>
      <SkeletonCard />
      <SkeletonTable rows={4} columns={5} />
    </div>
  );
}