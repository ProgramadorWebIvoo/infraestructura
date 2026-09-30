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
import { CheckCircle, CreditCard, DollarSign, FileSignature, FileWarning, SearchX, Wallet } from "lucide-react";
import Button from "@/components/UI/Button";
import IconActionButton from "@/components/UI/IconActionButton";
import Tooltip from "@/components/UI/Tooltip";
import type { PaymentOrder, Project, Proposal } from "@/types";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import PaymentSettlementModal, { buildPaymentTarget, type PaymentTarget } from "./PaymentSettlementModal";
import type { SettlementPayload } from "@/hooks/usePaymentSettlement";
import PaymentOrderDetailModal from "@/components/PaymentOrder/PaymentOrderDetailModal";
import ClosureFinalQuantities from "@/components/ClosureReport/ClosureFinalQuantities";
import TableToolbar from "@/components/UI/TableToolbar";
import { Table, type Column } from "@/components/UI/Table";
import GridView from "@/components/UI/GridView/GridView";
import FinalSettlementsGridCard from "./FinalSettlementsGridCard";
import { useContainerRows } from "@/hooks/useContainerRows";
import { useTableViewMode } from "@/hooks/useTableViewMode";
import { useToast } from "@/components/UI/Toast";
import { viewSwitchVariants } from "@/animations";
import { formatNumber } from "@/utils";
import BsAmount from "@/components/UI/BsAmount";
import { useCurrencyConversion, formatBs } from "@/hooks/useCurrencyConversion";

interface FinalSettlementsSectionProps {
  pendingFinalPayments: Project[];
  /** El comprobante de pago es obligatorio — sin él no se puede confirmar la liquidación. */
  onPayFinal: (projectId: string, amount: number, proofFile: File, settlement: SettlementPayload) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
  authToken?: string;
  activeRole?: string;
}

interface SettlementRow {
  project: Project;
  winner: Proposal;
  paidAdvance: number;
  balanceDue: number;
}

export default function FinalSettlementsSection({ pendingFinalPayments, onPayFinal, onRefresh, authToken = "", activeRole }: FinalSettlementsSectionProps) {
  const [confirmPayFinal, setConfirmPayFinal] = useState<PaymentTarget | null>(null);
  const [viewOrder, setViewOrder] = useState<PaymentOrder | null>(null);
  const [query, setQuery] = useState("");
  const { showToast } = useToast();
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  // Orden por saldo pendiente descendente: la liquidación más grande primero.
  const rows = useMemo<SettlementRow[]>(() => {
    return pendingFinalPayments
      .map((project) => {
        const winner = project.proposals?.find(p => p.contractorCode === project.selectedContractorCode);
        if (!winner) return null;
        const paidAdvance = project.advancePaidAmount || 0;
        // El finiquito lo propone Auditoría (contratado − anticipo − disminuciones); sin él, el saldo simple.
        return { project, winner, paidAdvance, balanceDue: project.finiquitoAmount ?? winner.totalCost - paidAdvance };
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
    { key: "balanceDue", label: "Saldo Pendiente", width: "10rem", align: "right", sortable: true, render: ({ balanceDue }) => (
      <div>
        <span className="font-mono font-black text-slate-900">${formatNumber(balanceDue)}</span>
        <BsAmount amount={balanceDue} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="block" className="text-right" />
      </div>
    ) },
    { key: "action", label: "", width: "13rem", render: ({ project, balanceDue }) => {
      const pendingSignature = project.paymentOrders?.final?.pendingRequiredSignature ?? null;
      return (
        <div className="flex items-center justify-end gap-1.5">
          {project.paymentOrders?.final && (
            <IconActionButton
              label={`Ver orden de pago de ${project.title}`}
              tooltip="Ver orden de pago"
              tone="indigo"
              onClick={() => setViewOrder(project.paymentOrders!.final)}
              icon={<FileSignature className="h-3.5 w-3.5" />}
            />
          )}
          {pendingSignature ? (
            <Tooltip content={`Falta una firma en la orden: "${pendingSignature.label}" (${pendingSignature.userName ?? pendingSignature.role}). Haz clic para ir a firmar.`}>
              <Button
                id={`btn-pay-final-${project.id}`}
                onClick={() => setViewOrder(project.paymentOrders!.final)}
                variant="primary"
                colorScheme="amber"
                size="sm"
                icon={<FileWarning className="h-3.5 w-3.5" />}
              >
                Falta firma
              </Button>
            </Tooltip>
          ) : (
            <Button
              id={`btn-pay-final-${project.id}`}
              onClick={() => setConfirmPayFinal(buildPaymentTarget(project, balanceDue, project.paymentOrders?.final))}
              variant="primary"
              colorScheme="sky"
              size="sm"
              icon={<CreditCard className="h-3.5 w-3.5" />}
            >
              Aprobar
            </Button>
          )}
        </div>
      );
    } },
  ], [convert, hasRates, isLoadingRates]);

  const handleOpenConfirm = useCallback((project: Project, amount: number) => {
    setConfirmPayFinal(buildPaymentTarget(project, amount, project.paymentOrders?.final));
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
          description="Cierre el ciclo financiero de la obra pagando el saldo restante, previa certificación de calidad por Auditoría."
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
              <BsAmount amount={totalPending} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="block" />
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
              renderCard={({ project, winner, paidAdvance, balanceDue }) => (
                <FinalSettlementsGridCard
                  project={project}
                  winner={winner}
                  balanceDue={balanceDue}
                  paidAdvance={paidAdvance}
                  onOpenConfirm={() => handleOpenConfirm(project, balanceDue)}
                  onOpenOrder={project.paymentOrders?.final ? () => setViewOrder(project.paymentOrders!.final) : undefined}
                  convert={convert}
                  hasRates={hasRates}
                  isLoadingRates={isLoadingRates}
                />
              )}
              cardAccent={() => "info"}
              emptyState={emptyState}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentSettlementModal
        target={confirmPayFinal}
        onClose={() => setConfirmPayFinal(null)}
        onConfirm={onPayFinal}
        title="Aprobar Pago Final"
        action="aprobar el finiquito"
        consequence="Esta acción cerrará el ciclo financiero del proyecto."
        confirmLabel="Aprobar finiquito"
        details={confirmPayFinal && <ClosureFinalQuantities projectId={confirmPayFinal.projectId} authToken={authToken} />}
      />

      <PaymentOrderDetailModal order={viewOrder} onClose={() => setViewOrder(null)} authToken={authToken} activeRole={activeRole} onOrderSigned={onRefresh} />
    </Card>
  );
}
