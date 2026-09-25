/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Auditoría: auditoría de fin de obra — extraída de
 * AuditoriaPanel.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, MapPin } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import ClosureReviewModal from "@/components/ClosureReport/ClosureReviewModal";
import type { ClosureActions } from "@/hooks/projectsWorkflows/useClosureWorkflows";
import StatusBadge from "@/components/UI/StatusBadge";
import TableToolbar from "@/components/UI/TableToolbar";
import { Table, type Column } from "@/components/UI/Table";
import GridView from "@/components/UI/GridView/GridView";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { viewSwitchVariants } from "@/animations";
import { useContainerRows } from "@/hooks/useContainerRows";
import { useTableViewMode, type TableViewMode } from "@/hooks/useTableViewMode";
import { ProjectTypeBadge } from "./TechnicalReviewPresentational";
import AuditGridCard from "./AuditGridCard";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import BsAmount from "@/components/UI/BsAmount";

interface CompletionAuditSectionProps {
  projects: Project[];
  authToken: string;
  closureActions: ClosureActions;
  /** Vista con la que arranca la sección (Tabla o Grid) — configurable por el consumidor. */
  defaultViewMode?: TableViewMode;
}

const success = SEMANTIC_COLOR_MAP.success;

export default function CompletionAuditSection({ projects, authToken, closureActions, defaultViewMode = "grid" }: CompletionAuditSectionProps) {
  const { containerRef, rows: pageSize } = useContainerRows();
  const [detailProjectId, setDetailProjectId] = useState("");
  const [query, setQuery] = useState("");
  const { viewMode, viewToggle } = useTableViewMode(defaultViewMode);
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  const allPendingCompletionVerify = useMemo(
    () => projects.filter((p) => p.status === ProjectStatus.VERIFICANDO_FINALIZACION),
    [projects],
  );

  const pendingCompletionVerify = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPendingCompletionVerify;
    return allPendingCompletionVerify.filter(
      (p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
    );
  }, [allPendingCompletionVerify, query]);

  const detailProject = pendingCompletionVerify.find((p) => p.id === detailProjectId) ?? null;

  const closeDetail = () => setDetailProjectId("");

  const columns: Column<Project>[] = useMemo(() => [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className={`font-mono font-bold text-[10px] ${success.text600} whitespace-nowrap`}>{p.id}</span>,
    },
    {
      key: "title",
      label: "Título / Ubicación",
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{p.title}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {p.location}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      width: "5.5rem",
      sortable: true,
      render: (p) => <ProjectTypeBadge type={p.type} />,
    },
    {
      key: "status",
      label: "Estado",
      width: "9rem",
      sortable: true,
      render: (p) => (
        <StatusBadge code={p.status} />
      ),
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "8.5rem",
      align: "right",
      sortable: true,
      render: (p) => (
        <div className="text-right whitespace-nowrap">
          <div className="font-mono font-bold text-slate-800">{formatCurrency(p.estimatedTotal)}</div>
          <BsAmount amount={p.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
        </div>
      ),
    },
  ], []);

  return (
    <>
      <Card accent="success" className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col" fillHeight>
        <div className="px-6 pt-6 shrink-0">
          <SectionHeader
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Auditoría de Fin de Obra"
            description="Verifique de forma independiente lo ejecutado (partidas, materiales y fotos) y envíe la orden a Procura para solicitar el finiquito."
            color="emerald"
          />
        </div>

        <TableToolbar
          searchId="completion-audit-search"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Buscar por título, ID o ubicación..."
          searchAriaLabel="Buscar obras en seguimiento"
          countIcon={<BadgeCheck />}
          filteredCount={pendingCompletionVerify.length}
          totalCount={allPendingCompletionVerify.length}
          noun="obra por verificar"
          nounPlural="obras por verificar"
          viewToggle={{ ...viewToggle, accent: "success" }}
        />

        {allPendingCompletionVerify.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState message="No hay obras con visto bueno del residente pendientes de verificación." />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === "table" ? (
              <motion.div key="table" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
                <Table
                  columns={columns}
                  data={pendingCompletionVerify}
                  rowKey={(p) => p.id}
                  pageSize={pageSize}
                  fillViewport
                  stickyHeader
                  onRowClick={(p) => setDetailProjectId(p.id)}
                  selectedRowKey={detailProjectId}
                  emptyState={<EmptyState message="No hay obras que coincidan con la búsqueda." />}
                />
              </motion.div>
            ) : (
              <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
                <GridView
                  items={pendingCompletionVerify}
                  rowKey={(p) => p.id}
                  renderCard={(p) => (
                    <AuditGridCard project={p} convert={convert} hasRates={hasRates} isLoadingRates={isLoadingRates} />
                  )}
                  onSelect={(p) => setDetailProjectId(p.id)}
                  selectedKey={detailProjectId}
                  emptyState={<EmptyState message="No hay obras que coincidan con la búsqueda." />}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </Card>

      <ClosureReviewModal
        project={detailProject}
        mode="audit"
        authToken={authToken}
        actions={closureActions}
        onClose={closeDetail}
      />
    </>
  );
}
