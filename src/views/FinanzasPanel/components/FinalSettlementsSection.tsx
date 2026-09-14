/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de Finanzas: finiquitos y liquidaciones de cierre — lista de
 * obras con calidad verificada (LISTO_PAGO_FINAL) esperando el saldo final.
 *
 * Table/GridView con toggle (mismo patrón que InvestmentApprovalSection en
 * Procura / AdvancesSection en Finanzas) en vez de una lista de <div> hecha
 * a mano.
 */

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, CreditCard, DollarSign, SearchX, Wallet } from "lucide-react";
import Button from "@/components/UI/Button";
import type { Project, Proposal } from "@/types";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import PayWithProofModal from "./PayWithProofModal";
import TableToolbar from "@/components/UI/TableToolbar";
import { Table, type Column } from "@/components/UI/Table";
import GridView from "@/components/UI/GridView/GridView";
import FinalSettlementsGridCard from "./FinalSettlementsGridCard";
import { useContainerRows } from "@/hooks/useContainerRows";
import { useTableViewMode } from "@/hooks/useTableViewMode";
import { useToast } from "@/components/UI/Toast";
import { viewSwitchVariants } from "@/animations";
import { formatNumber } from "@/utils";

interface FinalSettlementsSectionProps {
  pendingFinalPayments: Project[];
  /** El comprobante de pago es obligatorio — sin él no se puede confirmar la liquidación. */
  onPayFinal: (projectId: string, amount: number, proofFile: File) => Promise<void>;
}

interface SettlementRow {
  project: Project;
  winner: Proposal;
  paidAdvance: number;
  balanceDue: number;
}

export default function FinalSettlementsSection({ pendingFinalPayments, onPayFinal }: FinalSettlementsSectionProps) {
  const [confirmPayFinal, setConfirmPayFinal] = useState<{ projectId: string; amount: number; title: string } | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [query, setQuery] = useState("");
  const { showToast } = useToast();
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();

  // Orden por saldo pendiente descendente: la liquidación más grande primero.
  const rows = useMemo<SettlementRow[]>(() => {
    return pendingFinalPayments
      .map((project) => {
        const winner = project.proposals?.find(p => p.contractorCode === project.selectedContractorCode);
        if (!winner) return null;
        const paidAdvance = project.advancePaidAmount || 0;
        return { project, winner, paidAdvance, balanceDue: winner.totalCost - paidAdvance };
      })
      .filter((row): row is SettlementRow => row !== null)
      .sort((a, b) => b.balanceDue - a.balanceDue);
  }, [pendingFinalPayments]);

  const totalPending = useMemo(() => rows.reduce((sum, r) => sum + r.balanceDue, 0), [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ project, winner }) =>
        project.title.toLowerCase().includes(q) ||
        project.id.toLowerCase().includes(q) ||
        winner.contractorName.toLowerCase().includes(q) ||
        winner.contractorCode.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const columns: Column<SettlementRow>[] = useMemo(() => [
    { key: "id", label: "ID", width: "6.5rem", sortable: true, render: ({ project }) => <span className="font-mono font-bold text-[10px] text-sky-600 whitespace-nowrap">{project.id}</span> },
    { key: "title", label: "Obra", sortable: true, render: ({ project }) => <div className="min-w-0 font-bold text-slate-800 truncate">{project.title}</div> },
    { key: "contractor", label: "Contratista", sortable: true, render: ({ winner }) => <div className="min-w-0 font-bold text-slate-800 truncate">{winner.contractorName}</div> },
    { key: "paidAdvance", label: "Anticipo Pagado", width: "9rem", align: "right", sortable: true, render: ({ paidAdvance }) => <span className="font-mono font-bold text-slate-600">${paidAdvance.toLocaleString()}</span> },
    { key: "totalCost", label: "Total Obra", width: "9rem", align: "right", sortable: true, render: ({ winner }) => <span className="font-mono font-bold text-slate-600">${winner.totalCost.toLocaleString()}</span> },
    { key: "balanceDue", label: "Saldo Pendiente", width: "10rem", align: "right", sortable: true, render: ({ balanceDue }) => <span className="font-mono font-black text-slate-900">${formatNumber(balanceDue)}</span> },
    { key: "action", label: "", width: "11rem", render: ({ project, balanceDue }) => (
      <Button
        id={`btn-pay-final-${project.id}`}
        onClick={() => setConfirmPayFinal({ projectId: project.id, amount: balanceDue, title: project.title })}
        variant="primary"
        colorScheme="sky"
        size="sm"
        className="w-full"
        icon={<CreditCard className="h-3.5 w-3.5" />}
      >
        Aprobar
      </Button>
    ) },
  ], []);

  const handleOpenConfirm = useCallback((projectId: string, amount: number, title: string) => {
    setConfirmPayFinal({ projectId, amount, title });
  }, []);

  const emptyMessage = rows.length === 0
    ? "No hay liquidaciones pendientes."
    : "No hay liquidaciones que coincidan con la búsqueda.";
  const emptyState = <EmptyState message={emptyMessage} icon={rows.length === 0 ? <CheckCircle className="h-8 w-8 text-slate-300" /> : <SearchX className="h-8 w-8" />} />;

  return (
    <Card accent="info" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
      <div className="px-6 pt-6 shrink-0">
        <SectionHeader
          icon={<DollarSign className="h-5 w-5" />}
          title="Finiquitos y Liquidaciones de Cierre (100%)"
          description="Cierre el ciclo financiero de la obra pagando el saldo restante, previa certificación de calidad por Cierre de Obra."
          color="sky"
        />

        {rows.length > 0 && (
          <div className="flex items-center gap-2.5 mt-4 p-3.5 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white">
            <div className="p-1.5 rounded-lg bg-sky-100">
              <Wallet className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-sky-500 block">Total Pendiente por Liquidar</span>
              <span className="text-lg font-black font-mono text-sky-900">${formatNumber(totalPending)}</span>
            </div>
            <span className="ml-auto text-[10px] font-mono font-bold text-sky-400">{rows.length} obra{rows.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>

      <TableToolbar
        searchId="finanzas-settlements-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por obra, contratista o ID..."
        searchAriaLabel="Buscar liquidaciones pendientes"
        countIcon={<DollarSign />}
        filteredCount={visibleRows.length}
        totalCount={rows.length}
        noun="liquidación pendiente"
        nounPlural="liquidaciones pendientes"
        viewToggle={viewToggle}
      />

      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          <motion.div key="table" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
            <Table
              columns={columns}
              data={visibleRows}
              rowKey={(row) => row.project.id}
              pageSize={pageSize}
              fillViewport
              stickyHeader
              emptyState={emptyState}
            />
          </motion.div>
        ) : (
          <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
            <GridView
              items={visibleRows}
              rowKey={(row) => row.project.id}
              renderCard={({ project, winner, paidAdvance, balanceDue }) => (
                <FinalSettlementsGridCard
                  project={project}
                  winner={winner}
                  balanceDue={balanceDue}
                  paidAdvance={paidAdvance}
                  onOpenConfirm={() => handleOpenConfirm(project.id, balanceDue, project.title)}
                />
              )}
              cardAccent={() => "info"}
              emptyState={emptyState}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PayWithProofModal
        isOpen={!!confirmPayFinal}
        onClose={() => { setConfirmPayFinal(null); setProofFiles([]); }}
        onConfirm={async () => {
          if (!confirmPayFinal || proofFiles.length === 0) return;
          setIsPaying(true);
          try {
            await onPayFinal(confirmPayFinal.projectId, confirmPayFinal.amount, proofFiles[0]);
            setConfirmPayFinal(null);
            setProofFiles([]);
          } finally {
            setIsPaying(false);
          }
        }}
        title="Aprobar Pago Final"
        message={`¿Estás seguro de aprobar el finiquito de $${formatNumber(confirmPayFinal?.amount ?? 0)} para la obra "${confirmPayFinal?.title ?? ""}"? Esta acción cerrará el ciclo financiero del proyecto.`}
        variant="warning"
        confirmLabel="Aprobar finiquito"
        isLoading={isPaying}
        proofFiles={proofFiles}
        onProofFilesChange={setProofFiles}
        onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "warning")}
      />
    </Card>
  );
}
