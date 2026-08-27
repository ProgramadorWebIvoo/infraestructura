/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lista de propuestas de materiales de proveedores — extraída de
 * ProveedoresRegistrados. Cada fila dispara la inspección del detalle
 * completo en un modal (InspectSupplierProposalModal) en vez de expandirse
 * como acordeón inline: con el detalle completo (materiales línea por línea,
 * condiciones, notas) el acordeón empujaba el resto de la lista y era fácil
 * perder el contexto de qué otra fila se estaba comparando.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Mail, Package, SearchX } from "lucide-react";
import Card from "../../../components/UI/Card";
import TableToolbar from "../../../components/UI/TableToolbar";
import EmptyState from "../../../components/UI/EmptyState";
import { Table, type Column } from "../../../components/UI/Table";
import { itemVariants } from "../../../animations";
import { useContainerRows } from "../../../hooks/useContainerRows";
import InspectSupplierProposalModal from "./InspectSupplierProposalModal";
import type { SupplierMaterialProposal } from "../../../types";

interface SupplierProposalsListProps {
  proposals: SupplierMaterialProposal[];
  isLoading: boolean;
}

const proposalTotal = (p: SupplierMaterialProposal) =>
  p.items.reduce((sum, i) => sum + i.totalPrice, 0);

export default function SupplierProposalsList({ proposals, isLoading }: SupplierProposalsListProps) {
  const [proposalSearch, setProposalSearch] = useState("");
  const [inspectingProposal, setInspectingProposal] = useState<SupplierMaterialProposal | null>(null);
  const { containerRef, rows: pageSize } = useContainerRows();

  const filteredProposals = useMemo(
    () =>
      proposals.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(proposalSearch.toLowerCase()) ||
          (p.supplierCompany ?? "").toLowerCase().includes(proposalSearch.toLowerCase()) ||
          p.projectTitleSnapshot.toLowerCase().includes(proposalSearch.toLowerCase()) ||
          p.id.toLowerCase().includes(proposalSearch.toLowerCase())
      ),
    [proposals, proposalSearch],
  );

  const proposalColumns: Column<SupplierMaterialProposal>[] = useMemo(() => [
    { key: "id", label: "ID", width: "7rem", render: (p) => <span className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600">{p.id}</span> },
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
    { key: "projectTitleSnapshot", label: "Obra", sortable: true, render: (p) => <span className="text-xs font-semibold text-slate-600 truncate block max-w-xs">{p.projectTitleSnapshot}</span> },
    { key: "items", label: "Materiales", width: "7rem", align: "center", sortValue: (p) => p.items.length, render: (p) => <span className="font-mono text-xs font-black text-slate-600">{p.items.length}</span> },
    { key: "submittedAt", label: "Fecha", width: "7rem", sortable: true, render: (p) => <span className="text-[11px] font-semibold text-slate-500">{p.submittedAt}</span> },
    {
      key: "total",
      label: "Total Oferta",
      width: "9rem",
      align: "right",
      sortValue: (p) => proposalTotal(p),
      render: (p) => <span className="font-mono text-sm font-black text-indigo-700">${proposalTotal(p).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    { key: "chevron", label: "", width: "2rem", align: "center", render: () => <ChevronRight className="h-4 w-4 text-slate-300" /> },
  ], []);

  return (
    <>
      <Card accent="info" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
        <TableToolbar
          searchId="supplier-proposal-search"
          searchValue={proposalSearch}
          onSearchChange={setProposalSearch}
          searchPlaceholder="Buscar por proveedor u obra..."
          searchAriaLabel="Buscar propuestas de materiales"
          countIcon={<Package />}
          filteredCount={filteredProposals.length}
          totalCount={proposals.length}
          noun="propuesta"
          nounPlural="propuestas"
        />

        <motion.div variants={itemVariants} initial="hidden" animate="visible" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
          <Table
            columns={proposalColumns}
            data={filteredProposals}
            rowKey={(p) => p.id}
            isLoading={isLoading}
            pageSize={pageSize}
            fillViewport
            stickyHeader
            onRowClick={(p) => setInspectingProposal(p)}
            emptyState={
              <EmptyState
                message={proposals.length === 0 ? "Aún no se han recibido propuestas de materiales." : "No se encontraron propuestas con ese criterio."}
                icon={<SearchX className="h-8 w-8" />}
              />
            }
          />
        </motion.div>
      </Card>

      {inspectingProposal && (
        <InspectSupplierProposalModal
          proposal={inspectingProposal}
          onClose={() => setInspectingProposal(null)}
        />
      )}
    </>
  );
}
