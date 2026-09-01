/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal que muestra todas las propuestas de materiales de un proyecto específico.
 * Permite inspeccionar cada propuesta en detalle.
 */

import { useMemo, useState } from "react";
import { ChevronRight, FileSearch, Mail, Package } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import { Table, type Column } from "../../../components/UI/Table";
import TableToolbar from "../../../components/UI/TableToolbar";
import EmptyState from "../../../components/UI/EmptyState";
import InspectSupplierProposalModal from "./InspectSupplierProposalModal";
import { formatCurrency } from "../../../utils";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";
import type { SupplierMaterialProposal } from "../../../types";

interface ProjectProposalsModalProps {
  projectId: string;
  projectTitle: string;
  proposals: SupplierMaterialProposal[];
  onClose: () => void;
  isOpen: boolean;
}

const proposalTotal = (p: SupplierMaterialProposal) =>
  p.items.reduce((sum, i) => sum + i.totalPrice, 0);

export default function ProjectProposalsModal({
  projectId,
  projectTitle,
  proposals,
  onClose,
  isOpen,
}: ProjectProposalsModalProps) {
  const [proposalSearch, setProposalSearch] = useState("");
  const [inspectingProposal, setInspectingProposal] = useState<SupplierMaterialProposal | null>(null);
  const { convert, hasRates } = useCurrencyConversion();

  const projectProposals = useMemo(
    () => proposals.filter((p) => p.projectId === projectId),
    [proposals, projectId]
  );

  const filteredProposals = useMemo(
    () =>
      projectProposals.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(proposalSearch.toLowerCase()) ||
          (p.supplierCompany ?? "").toLowerCase().includes(proposalSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(proposalSearch.toLowerCase())
      ),
    [projectProposals, proposalSearch]
  );

  const proposalColumns: Column<SupplierMaterialProposal>[] = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        width: "7rem",
        render: (p) => (
          <span className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600">
            {p.id}
          </span>
        ),
      },
      {
        key: "supplierName",
        label: "Proveedor",
        sortable: true,
        render: (p) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-black text-slate-800">{p.supplierName}</span>
              {p.supplierCompany && <span className="text-[11px] font-semibold text-slate-500">{p.supplierCompany}</span>}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 font-medium">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.supplierContact}</span>
            </div>
          </div>
        ),
      },
      {
        key: "items",
        label: "Materiales",
        width: "7rem",
        align: "center",
        sortValue: (p) => p.items.length,
        render: (p) => <span className="font-mono text-xs font-black text-slate-600">{p.items.length}</span>,
      },
      {
        key: "submittedAt",
        label: "Fecha",
        width: "7rem",
        sortable: true,
        render: (p) => <span className="text-[11px] font-semibold text-slate-500">{p.submittedAt}</span>,
      },
      {
        key: "total",
        label: "Total Oferta",
        width: "9rem",
        align: "right",
        sortValue: (p) => proposalTotal(p),
        // Cada propuesta trae su propia moneda de cotización (una por pedido)
        // — no asumir USD, un proveedor pudo cotizar en EUR.
        render: (p) => {
          const currency = p.quoteCurrency ?? "USD";
          const total = proposalTotal(p);
          return (
            <div className="text-right whitespace-nowrap">
              <div className="font-mono text-sm font-black text-indigo-700">{formatCurrency(total, currency)}</div>
              <div className="font-mono text-[9px] font-semibold text-slate-400">
                {currency}
                {hasRates && ` · Bs. ${formatBs(convert(total, currency))}`}
              </div>
            </div>
          );
        },
      },
      { key: "chevron", label: "", width: "2rem", align: "center", render: () => <ChevronRight className="h-4 w-4 text-slate-300" /> },
    ],
    [convert, hasRates]
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-4xl"
        icon={<FileSearch className="h-5 w-5" />}
        iconColor="indigo"
        badge="Propuestas del Proyecto"
        title={projectTitle}
        infoLine={`${projectProposals.length} propuestas recibidas`}
      >
        <div className="space-y-4">
          <TableToolbar
            searchId="project-proposal-search"
            searchValue={proposalSearch}
            onSearchChange={setProposalSearch}
            searchPlaceholder="Buscar por proveedor..."
            searchAriaLabel="Buscar propuestas del proyecto"
            countIcon={<Package />}
            filteredCount={filteredProposals.length}
            totalCount={projectProposals.length}
            noun="propuesta"
            nounPlural="propuestas"
          />

          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            <Table
              columns={proposalColumns}
              data={filteredProposals}
              rowKey={(p) => p.id}
              pageSize={10}
              onRowClick={(p) => setInspectingProposal(p)}
              emptyState={
                <EmptyState
                  message={
                    projectProposals.length === 0
                      ? "No se han recibido propuestas para este proyecto."
                      : "No se encontraron propuestas con ese criterio."
                  }
                  icon={<FileSearch className="h-8 w-8" />}
                />
              }
            />
          </div>
        </div>
      </Modal>

      {inspectingProposal && (
        <InspectSupplierProposalModal
          proposal={inspectingProposal}
          onClose={() => setInspectingProposal(null)}
        />
      )}
    </>
  );
}
