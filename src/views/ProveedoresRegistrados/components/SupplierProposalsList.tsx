/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lista de proyectos con propuestas de materiales de proveedores.
 * Muestra solo los proyectos activos que tienen propuestas recibidas.
 * Soporta toggle entre vista de tabla y grilla — mismo patrón que
 * ContractorsSection (useTableViewMode, AnimatePresence, toggle en toolbar).
 * Al hacer clic en un proyecto, abre un modal con todas sus propuestas.
 */

import { useMemo, useState } from "react";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Package, SearchX } from "lucide-react";
import Card from "../../../components/UI/Card";
import TableToolbar from "../../../components/UI/TableToolbar";
import EmptyState from "../../../components/UI/EmptyState";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import { itemVariants } from "../../../animations";
import { useTableViewMode } from "../../../hooks/useTableViewMode";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { renderProjectGridCard } from "./ProjectGridCard";
import ProjectProposalsModal from "./ProjectProposalsModal";
import { formatCurrency } from "../../../utils";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";
import type { SupplierMaterialProposal } from "../../../types";

/** Moneda en la que se expresan los totales agregados de esta vista. */
const DISPLAY_CURRENCY = "USD";

interface SupplierProposalsListProps {
  proposals: SupplierMaterialProposal[];
  isLoading: boolean;
}

interface ProjectProposalSummary {
  projectId: string;
  projectTitle: string;
  proposalCount: number;
  totalAmount: number;
  latestProposalDate: string;
}

function SupplierProposalsListComponent({ proposals, isLoading }: SupplierProposalsListProps) {
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectProposalSummary | null>(null);
  const { viewMode, viewToggle } = useTableViewMode("table");
  const { containerRef, rows: pageSize } = useContainerRows();
  const { convert, convertBetween, hasRates } = useCurrencyConversion();

  const projectProposalsSummary = useMemo(() => {
    const projectMap = new Map<string, { title: string; proposals: SupplierMaterialProposal[] }>();

    proposals.forEach((proposal) => {
      if (!projectMap.has(proposal.projectId)) {
        projectMap.set(proposal.projectId, {
          title: proposal.projectTitleSnapshot,
          proposals: [],
        });
      }
      projectMap.get(proposal.projectId)!.proposals.push(proposal);
    });

    return Array.from(projectMap.entries()).map(([projectId, data]) => {
      // Cada propuesta puede venir en una moneda distinta (una por pedido):
      // hay que llevarlas todas a una moneda común ANTES de sumar, o el
      // total mezcla unidades (1000 USD + 900 EUR ≠ 1900 de nada).
      const totalAmount = data.proposals.reduce((sum, p) => {
        const proposalTotal = p.items.reduce((itemSum, i) => itemSum + i.totalPrice, 0);
        const currency = p.quoteCurrency ?? DISPLAY_CURRENCY;
        return sum + (currency === DISPLAY_CURRENCY || !hasRates
          ? proposalTotal
          : convertBetween(proposalTotal, currency, DISPLAY_CURRENCY));
      }, 0);
      const latestDate = data.proposals
        .map((p) => new Date(p.submittedAt).getTime())
        .reduce((max, current) => (current > max ? current : max), 0);

      return {
        projectId,
        projectTitle: data.title,
        proposalCount: data.proposals.length,
        totalAmount,
        latestProposalDate: new Date(latestDate).toLocaleDateString("es-ES"),
      };
    });
  }, [proposals, convertBetween, hasRates]);

  const filteredProjects = useMemo(
    () =>
      projectProposalsSummary.filter((p) =>
        p.projectTitle.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.projectId.toLowerCase().includes(projectSearch.toLowerCase())
      ),
    [projectProposalsSummary, projectSearch]
  );

  const projectColumns: Column<ProjectProposalSummary>[] = useMemo(
    () => [
      {
        key: "projectId",
        label: "ID Proyecto",
        width: "8rem",
        render: (p) => (
          <span className="rounded-lg border border-sky-200 bg-linear-to-br from-sky-50 to-sky-100/50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">
            {p.projectId}
          </span>
        ),
      },
      {
        key: "projectTitle",
        label: "Proyecto",
        sortable: true,
        render: (p) => <span className="text-xs font-semibold text-slate-700">{p.projectTitle}</span>,
      },
      {
        key: "proposalCount",
        label: "Propuestas",
        width: "7rem",
        align: "center",
        sortable: true,
        render: (p) => (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            <Package className="h-3.5 w-3.5" />
            {p.proposalCount}
          </span>
        ),
      },
      {
        key: "totalAmount",
        label: "Monto Total",
        width: "10rem",
        align: "right",
        sortable: true,
        sortValue: (p) => p.totalAmount,
        render: (p) => (
          <div className="text-right whitespace-nowrap">
            <div className="font-mono text-sm font-black text-emerald-700">
              {formatCurrency(p.totalAmount, DISPLAY_CURRENCY)}
            </div>
            {hasRates && (
              <div className="font-mono text-[9px] font-semibold text-slate-400">
                Bs. {formatBs(convert(p.totalAmount, DISPLAY_CURRENCY))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "latestProposalDate",
        label: "Última Propuesta",
        width: "8rem",
        render: (p) => <span className="text-[11px] font-semibold text-slate-500">{p.latestProposalDate}</span>,
      },
      { key: "chevron", label: "", width: "2rem", align: "center", render: () => <ChevronRight className="h-4 w-4 text-slate-300" /> },
    ],
    [convert, hasRates]
  );

  return (
    <>
      <Card accent="info" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
        <TableToolbar
          searchId="project-search"
          searchValue={projectSearch}
          onSearchChange={setProjectSearch}
          searchPlaceholder="Buscar por nombre o ID de proyecto..."
          searchAriaLabel="Buscar proyectos"
          countIcon={<Package />}
          filteredCount={filteredProjects.length}
          totalCount={projectProposalsSummary.length}
          noun="proyecto"
          nounPlural="proyectos"
          viewToggle={{ ...viewToggle, accent: "info" }}
        />

        <AnimatePresence mode="wait">
          {viewMode === "table" ? (
            <motion.div
              key="table"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              ref={containerRef}
              className="flex-1 min-h-0 px-6 pb-6 pt-4"
            >
              <Table
                columns={projectColumns}
                data={filteredProjects}
                rowKey={(p) => p.projectId}
                isLoading={isLoading}
                pageSize={pageSize}
                fillViewport
                stickyHeader
                onRowClick={(p) => setSelectedProject(p)}
                emptyState={
                  <EmptyState
                    message={
                      projectProposalsSummary.length === 0
                        ? "Aún no se han recibido propuestas de materiales."
                        : "No se encontraron proyectos con ese criterio."
                    }
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex-1 min-h-0 px-6 pb-6 pt-4"
            >
              <GridView
                items={filteredProjects}
                rowKey={(p) => p.projectId}
                onSelect={(p) => setSelectedProject(p)}
                renderCard={(p) => renderProjectGridCard(p)}
                cardAccent={() => "info"}
                emptyState={
                  <EmptyState
                    message={
                      projectProposalsSummary.length === 0
                        ? "Aún no se han recibido propuestas de materiales."
                        : "No se encontraron proyectos con ese criterio."
                    }
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {selectedProject && (
        <ProjectProposalsModal
          projectId={selectedProject.projectId}
          projectTitle={selectedProject.projectTitle}
          proposals={proposals}
          onClose={() => setSelectedProject(null)}
          isOpen={true}
        />
      )}
    </>
  );
}

export default React.memo(SupplierProposalsListComponent);
