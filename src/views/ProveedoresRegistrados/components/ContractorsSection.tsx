/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla/grid de proveedores registrados — extraída de ProveedoresRegistrados.
 * Reescrita sobre el vocabulario compartido (Card, TableToolbar, Tooltip vía
 * IconActionButton, toggle Tabla/Grid) en vez de markup a mano: antes era la
 * única vista de configuración de datos sin estos componentes, con un look
 * visiblemente distinto al resto de la app.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link2, Mail, Pencil, SearchX, Star, Users } from "lucide-react";
import { itemVariants } from "../../../animations";
import Card from "../../../components/UI/Card";
import TableToolbar from "../../../components/UI/TableToolbar";
import EmptyState from "../../../components/UI/EmptyState";
import IconActionButton from "../../../components/UI/IconActionButton";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { useTableViewMode } from "../../../hooks/useTableViewMode";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { renderContractorGridCard } from "./ContractorGridCard";
import type { Contractor } from "../../../types";

interface ContractorsSectionProps {
  contractors: Contractor[];
  isLoading: boolean;
  onOpenEdit: (contractor: Contractor) => void;
  onOpenInvite: (contractor: Contractor) => void;
}

export default function ContractorsSection({
  contractors,
  isLoading,
  onOpenEdit,
  onOpenInvite,
}: ContractorsSectionProps) {
  const [query, setQuery] = useState("");
  const filteredContractors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contractors.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.specialty.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [contractors, query]);
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();

  const contractorColumns: Column<Contractor>[] = useMemo(() => [
    { key: "code", label: "Código", width: "8rem", render: (c) => <span className="rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600">{c.code}</span> },
    { key: "name", label: "Empresa", sortable: true, render: (c) => <span className="font-bold text-slate-800">{c.name}</span> },
    { key: "specialty", label: "Especialidad", sortable: true, render: (c) => <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{c.specialty}</span> },
    { key: "email", label: "Contacto", render: (c) => <div className="flex items-center gap-2 font-mono font-semibold text-slate-500"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />{c.email}</div> },
    {
      key: "rating",
      label: "Rating",
      width: "6rem",
      align: "center",
      sortable: true,
      render: (c) => (
        <div className={`inline-flex items-center gap-1 rounded-lg border ${SEMANTIC_COLOR_MAP.warning.border200} bg-linear-to-br ${SEMANTIC_COLOR_MAP.warning.bg50} to-warning-100/50 px-2.5 py-1 font-mono text-[11px] font-black ${SEMANTIC_COLOR_MAP.warning.text600}`}>
          <Star className={`h-3.5 w-3.5 fill-warning-400 ${SEMANTIC_COLOR_MAP.warning.icon500}`} />
          {c.rating.toFixed(1)}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "7rem",
      align: "center",
      render: (c) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconActionButton
            label={`Actualizar evaluación de ${c.name}`}
            tooltip="Actualizar evaluación"
            onClick={() => onOpenEdit(c)}
            tone="sky"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconActionButton
            label={`Generar enlace de propuesta para ${c.name}`}
            tooltip="Generar enlace de propuesta"
            onClick={() => onOpenInvite(c)}
            tone="indigo"
            icon={<Link2 className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ], [onOpenEdit, onOpenInvite]);

  return (
    <Card accent="brand" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
      <TableToolbar
        searchId="registered-provider-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por nombre, código, correo o especialidad..."
        searchAriaLabel="Buscar proveedores registrados"
        countIcon={<Users />}
        filteredCount={filteredContractors.length}
        totalCount={contractors.length}
        noun="proveedor"
        nounPlural="proveedores"
        viewToggle={{ ...viewToggle, accent: "brand" }}
      />

      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          <motion.div key="table" variants={itemVariants} initial="hidden" animate="visible" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
            <Table
              columns={contractorColumns}
              data={filteredContractors}
              rowKey={(c) => c.code}
              isLoading={isLoading}
              pageSize={pageSize}
              fillViewport
              stickyHeader
              emptyState={
                <EmptyState
                  message={contractors.length === 0 ? "Aún no hay proveedores registrados." : "No se encontraron proveedores con ese criterio."}
                  icon={<SearchX className="h-8 w-8" />}
                />
              }
            />
          </motion.div>
        ) : (
          <motion.div key="grid" variants={itemVariants} initial="hidden" animate="visible" className="flex-1 min-h-0 px-6 pb-6 pt-4">
            <GridView
              items={filteredContractors}
              rowKey={(c) => c.code}
              renderCard={(c) => renderContractorGridCard(c, { onOpenEdit, onOpenInvite })}
              cardAccent={() => "brand"}
              emptyState={
                <EmptyState
                  message={contractors.length === 0 ? "Aún no hay proveedores registrados." : "No se encontraron proveedores con ese criterio."}
                  icon={<SearchX className="h-8 w-8" />}
                />
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
