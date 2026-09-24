/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de Finanzas: liberación de anticipos pactados — lista de obras
 * recién adjudicadas (CONTRATADO) esperando el primer desembolso.
 *
 * Table/GridView con toggle (mismo patrón que InvestmentApprovalSection en
 * Procura) en vez de una lista de <div> hecha a mano: reutiliza búsqueda,
 * orden por columna, y la alternancia tabla-densa/tarjetas ya resuelta por
 * TableToolbar + Table + GridView, sin reinventar el layout.
 */

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Coins, CreditCard, SearchX, Wallet } from "lucide-react";
import Button from "@/components/UI/Button";
import type { Project, Proposal } from "@/types";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import PayWithProofModal from "./PayWithProofModal";
import TableToolbar from "@/components/UI/TableToolbar";
import { Table, type Column } from "@/components/UI/Table";
import GridView from "@/components/UI/GridView/GridView";
import AdvancesGridCard from "./AdvancesGridCard";
import { useContainerRows } from "@/hooks/useContainerRows";
import { useTableViewMode } from "@/hooks/useTableViewMode";
import { useToast } from "@/components/UI/Toast";
import { viewSwitchVariants } from "@/animations";
import { formatNumber } from "@/utils";

interface AdvancesSectionProps {
  pendingAdvances: Project[];
  /** El comprobante de pago es obligatorio — sin él no se puede confirmar la liberación. */
  onPayAdvance: (projectId: string, amount: number, proofFile: File) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
}

interface AdvanceRow {
  project: Project;
  winner: Proposal;
  advAmount: number;
}

export default function AdvancesSection({ pendingAdvances, onPayAdvance, onRefresh }: AdvancesSectionProps) {
  const [confirmPayAdvance, setConfirmPayAdvance] = useState<{ projectId: string; amount: number; title: string } | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [query, setQuery] = useState("");
  const { showToast } = useToast();
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();

  // Solo obras con un ganador resuelto (winner) participan del flujo —
  // sin propuesta adjudicada no hay monto de anticipo que calcular. Orden
  // por monto descendente: el mayor desembolso pendiente es lo primero que
  // Finanzas necesita ver, no un orden arbitrario de llegada.
  const rows = useMemo<AdvanceRow[]>(() => {
    return pendingAdvances
      .map((project) => {
        const winner = project.proposals?.find(p => p.contractorCode === project.selectedContractorCode);
        if (!winner) return null;
        return { project, winner, advAmount: winner.totalCost * (winner.negotiatedAdvancePercent / 100) };
      })
      .filter((row): row is AdvanceRow => row !== null)
      .sort((a, b) => b.advAmount - a.advAmount);
  }, [pendingAdvances]);

  const totalPending = useMemo(() => rows.reduce((sum, r) => sum + r.advAmount, 0), [rows]);

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

  const columns: Column<AdvanceRow>[] = useMemo(() => [
    { key: "id", label: "ID", width: "6.5rem", sortable: true, render: ({ project }) => <span className="font-mono font-bold text-[10px] text-rose-600 whitespace-nowrap">{project.id}</span> },
    { key: "title", label: "Obra", sortable: true, render: ({ project }) => <div className="min-w-0 font-bold text-slate-800 truncate">{project.title}</div> },
    { key: "contractor", label: "Contratista", sortable: true, render: ({ winner }) => (
      <div className="min-w-0">
        <div className="font-bold text-slate-800 truncate">{winner.contractorName}</div>
        <div className="font-mono text-[9px] text-sky-600 font-bold">{winner.contractorCode}</div>
      </div>
    ) },
    { key: "negotiatedAdvancePercent", label: "% Anticipo", width: "7rem", align: "right", sortable: true, render: ({ winner }) => <span className="font-mono font-black text-emerald-600">{winner.negotiatedAdvancePercent}%</span> },
    { key: "totalCost", label: "Total Obra", width: "9rem", align: "right", sortable: true, render: ({ winner }) => <span className="font-mono font-bold text-slate-600">${winner.totalCost.toLocaleString()}</span> },
    { key: "advAmount", label: "Monto Anticipo", width: "10rem", align: "right", sortable: true, render: ({ advAmount }) => <span className="font-mono font-black text-slate-900">${formatNumber(advAmount)}</span> },
    { key: "action", label: "", width: "11rem", render: ({ project, advAmount }) => (
      <Button
        id={`btn-pay-advance-${project.id}`}
        onClick={() => setConfirmPayAdvance({ projectId: project.id, amount: advAmount, title: project.title })}
        variant="primary"
        colorScheme="rose"
        size="sm"
        className="w-full"
        icon={<CreditCard className="h-3.5 w-3.5" />}
      >
        Liberar
      </Button>
    ) },
  ], []);

  const handleOpenConfirm = useCallback((projectId: string, amount: number, title: string) => {
    setConfirmPayAdvance({ projectId, amount, title });
  }, []);

  const emptyMessage = rows.length === 0
    ? "No hay anticipos pendientes por liberar."
    : "No hay anticipos que coincidan con la búsqueda.";
  const emptyState = <EmptyState message={emptyMessage} icon={rows.length === 0 ? <CheckCircle className="h-8 w-8 text-slate-300" /> : <SearchX className="h-8 w-8" />} />;

  return (
    <Card accent="danger" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
      <div className="px-6 pt-6 shrink-0">
        <SectionHeader
          icon={<Coins className="h-5 w-5" />}
          title="Liberación de Anticipos Pactados (Inicio Obra)"
          description="Autorice el primer desembolso de fondos acordado para que el contratista inicie los trabajos de campo."
          color="rose"
        />

        {rows.length > 0 && (
          <div className="flex items-center gap-2.5 mt-4 p-3.5 rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-white">
            <div className="p-1.5 rounded-lg bg-rose-100">
              <Wallet className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-rose-500 block">Total Pendiente por Liberar</span>
              <span className="text-lg font-black font-mono text-rose-900">${formatNumber(totalPending)}</span>
            </div>
            <span className="ml-auto text-[10px] font-mono font-bold text-rose-400">{rows.length} obra{rows.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>

      <TableToolbar
        searchId="finanzas-advances-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por obra, contratista o ID..."
        searchAriaLabel="Buscar anticipos pendientes"
        countIcon={<Coins />}
        filteredCount={visibleRows.length}
        totalCount={rows.length}
        noun="anticipo pendiente"
        nounPlural="anticipos pendientes"
        viewToggle={viewToggle}
        onRefresh={onRefresh}
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
              renderCard={({ project, winner, advAmount }) => (
                <AdvancesGridCard
                  project={project}
                  winner={winner}
                  advAmount={advAmount}
                  onOpenConfirm={() => handleOpenConfirm(project.id, advAmount, project.title)}
                />
              )}
              cardAccent={() => "danger"}
              emptyState={emptyState}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PayWithProofModal
        isOpen={!!confirmPayAdvance}
        onClose={() => { setConfirmPayAdvance(null); setProofFiles([]); }}
        onConfirm={async () => {
          if (!confirmPayAdvance || proofFiles.length === 0) return;
          setIsPaying(true);
          try {
            await onPayAdvance(confirmPayAdvance.projectId, confirmPayAdvance.amount, proofFiles[0]);
            setConfirmPayAdvance(null);
            setProofFiles([]);
          } finally {
            setIsPaying(false);
          }
        }}
        title="Liberar Anticipo"
        message={`¿Estás seguro de liberar el anticipo de $${formatNumber(confirmPayAdvance?.amount ?? 0)} para la obra "${confirmPayAdvance?.title ?? ""}"? Esta acción registrará el pago en el diario de egresos y cambiará el estado del proyecto a "En ejecución".`}
        variant="warning"
        confirmLabel="Liberar anticipo"
        isLoading={isPaying}
        proofFiles={proofFiles}
        onProofFilesChange={setProofFiles}
        onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "warning")}
      />
    </Card>
  );
}
