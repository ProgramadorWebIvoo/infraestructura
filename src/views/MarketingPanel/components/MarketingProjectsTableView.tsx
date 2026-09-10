/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chrome compartido de listado para Marketing: Card + SectionHeader +
 * TableToolbar (búsqueda + filtro + toggle Tabla/Grid) + Table/GridView.
 * Extraído de ProyectTab.tsx para que ProyectHistoryTab.tsx no reimplemente
 * las mismas ~150 líneas de layout — cada tab solo aporta sus propias
 * columnas, su propia tarjeta de grid, y su propio copy (título, filtros,
 * mensajes). Mismo patrón de "componente genérico + renderCard/columns del
 * dominio" que Table.tsx/GridView.tsx ya usan puertas adentro.
 */

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LayoutList, SearchX } from "lucide-react";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import TableToolbar from "@/components/UI/TableToolbar";
import type { SelectOption } from "@/components/UI/FilterBar";
import EmptyState from "@/components/UI/EmptyState";
import { Table, type Column } from "@/components/UI/Table";
import GridView from "@/components/UI/GridView/GridView";
import { useContainerRows } from "@/hooks/useContainerRows";
import { useTableViewMode, type TableViewMode } from "@/hooks/useTableViewMode";
import { viewSwitchVariants } from "@/animations";
import type { MarketingProject } from "../types";

export interface MarketingProjectsTableViewProps {
  projects: MarketingProject[];
  isLoading?: boolean;
  onView?: (project: MarketingProject) => void;

  icon: ReactNode;
  title: string;
  description: string;
  color?: string;

  columns: Column<MarketingProject>[];
  renderCard: (project: MarketingProject, index: number) => ReactNode;

  searchId: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  statusFilterId: string;
  statusFilterOptions: SelectOption[];
  emptyMessage: string;
  noun: string;
  nounPlural: string;
  defaultViewMode?: TableViewMode;
}

export default function MarketingProjectsTableView({
  projects,
  isLoading = false,
  onView,
  icon,
  title,
  description,
  color = "amber",
  columns,
  renderCard,
  searchId,
  searchPlaceholder,
  searchAriaLabel,
  statusFilterId,
  statusFilterOptions,
  emptyMessage,
  noun,
  nounPlural,
  defaultViewMode = "table",
}: MarketingProjectsTableViewProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { viewMode, viewToggle } = useTableViewMode(defaultViewMode);
  const { containerRef, rows: pageSize } = useContainerRows();

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  return (
    <Card className="!p-0 overflow-hidden" fillHeight>
      <div className="p-6 pb-0">
        <SectionHeader icon={icon} title={title} description={description} color={color} />
      </div>

      <TableToolbar
        searchId={searchId}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={searchPlaceholder}
        searchAriaLabel={searchAriaLabel}
        filter={{
          id: statusFilterId,
          value: statusFilter,
          onChange: setStatusFilter,
          ariaLabel: "Filtrar por estado",
          options: statusFilterOptions,
        }}
        countIcon={<LayoutList className="h-4 w-4" />}
        filteredCount={filteredProjects.length}
        totalCount={projects.length}
        noun={noun}
        nounPlural={nounPlural}
        viewToggle={viewToggle}
      />

      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          <motion.div
            key="table"
            variants={viewSwitchVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            ref={containerRef}
            className="flex-1 min-h-0"
          >
            <Table
              columns={columns}
              data={filteredProjects}
              rowKey={(row) => row.id}
              pageSize={pageSize}
              stickyHeader
              fillViewport
              isLoading={isLoading}
              emptyMessage={emptyMessage}
              onRowClick={onView}
            />
          </motion.div>
        ) : (
          <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-2 pb-2">
            <GridView
              items={filteredProjects}
              rowKey={(p) => p.id}
              renderCard={renderCard}
              onSelect={onView}
              cardAccent={() => "brand"}
              emptyState={<EmptyState message={emptyMessage} icon={<SearchX className="h-8 w-8" />} />}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
