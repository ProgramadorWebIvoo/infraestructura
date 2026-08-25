/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Peticiones rechazadas por Cierre de Obra: muestra dónde/por qué/qué se
 * rechazó (motivo desde AuditLog, sin columna propia — mismo criterio que
 * RejectionService::buildDetails) y permite editar y reenviar la misma
 * petición (mismo Project.id) para una nueva evaluación, sin crear una
 * petición nueva. Es contenido de una tab explícita (InfraestructuraMantenimientoPanel/index.tsx)
 * — cuando no hay rechazadas, muestra el emptyState de Table en vez de
 * autocultarse (antes vivía fuera de un sistema de tabs y sí se ocultaba).
 *
 * Usa el sistema de tabla compartido (Table/Column), igual que
 * RequestsTableSection — antes era una lista de cards apiladas, inconsistente
 * con el resto de la app, que sí usa tablas para listados de peticiones.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Pencil, SearchX, XCircle } from "lucide-react";
import type { AuditLog, Project, ProjectDocument } from "../../../types";
import { ProjectStatus } from "../../../types";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Modal from "../../../components/UI/Modal";
import EmptyState from "../../../components/UI/EmptyState";
import TableToolbar from "../../../components/UI/TableToolbar";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import RequestWizardCard from "./RequestWizardCard";
import RejectedPetitionDetailModal from "./RejectedPetitionDetailModal";
import { renderRejectedPetitionCard } from "./RejectedPetitionGridCard";
import { useRequestForm } from "../../../hooks/useRequestForm";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useTableViewMode, type TableViewMode } from "../../../hooks/useTableViewMode";
import { viewSwitchVariants } from "../../../animations";

const REJECT_ACTION = "Rechazo de petición de obra";

interface RejectedPetitionsSectionProps {
  projects: Project[];
  auditLogs: AuditLog[];
  authToken: string;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  onResubmitProject: (
    projectId: string,
    project: Omit<Project, "id" | "createdDate" | "status" | "type">,
    files: { photos: File[]; documents: File[]; plans: File[] },
    existingDocuments: ProjectDocument[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onDeleteDocument: (projectId: string, documentId: number) => Promise<void>;
  /** Vista con la que arranca la sección (Tabla o Grid) — configurable por el consumidor. */
  defaultViewMode?: TableViewMode;
}

function latestRejectionLog(auditLogs: AuditLog[], projectId: string): AuditLog | undefined {
  return auditLogs
    .filter((l) => l.projectId === projectId && l.action === REJECT_ACTION)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function EditAndResubmitModal({
  project,
  materialsCatalog,
  authToken,
  onResubmitProject,
  onDeleteDocument,
  onClose,
}: {
  project: Project;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  authToken: string;
  onResubmitProject: RejectedPetitionsSectionProps["onResubmitProject"];
  onDeleteDocument: RejectedPetitionsSectionProps["onDeleteDocument"];
  onClose: () => void;
}) {
  const form = useRequestForm({
    onAddProject: async () => ({ ok: false, partial: false, failedGroups: [] }),
    existingProject: project,
    onResubmitProject: async (...args) => {
      // El toast de éxito/advertencia ya lo emite handleResubmitProject en
      // useProjectsWorkflows.ts (única fuente de verdad, conoce el resultado
      // real de los uploads) — duplicarlo acá mostraba 2 toasts idénticos.
      const result = await onResubmitProject(...args);
      if (result.ok) {
        onClose();
      }
      return result;
    },
    onDeleteDocument,
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-4xl"
      icon={<Pencil className="h-5 w-5" />}
      iconColor="sky"
      badge="Corregir y Reenviar Petición"
      title={project.id}
      infoLine={project.title}
    >
      <div className="h-[70vh] -m-6 p-6 pt-5">
        <RequestWizardCard form={form} materialsCatalog={materialsCatalog} authToken={authToken} variant="embedded" />
      </div>
    </Modal>
  );
}

export default function RejectedPetitionsSection({
  projects,
  auditLogs,
  authToken,
  materialsCatalog,
  onResubmitProject,
  onDeleteDocument,
  defaultViewMode = "grid",
}: RejectedPetitionsSectionProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [query, setQuery] = useState("");
  const { viewMode, viewToggle } = useTableViewMode(defaultViewMode);
  const { containerRef, rows: pageSize } = useContainerRows();

  const allRejected = useMemo(
    () =>
      projects
        .filter((p) => p.status === ProjectStatus.RECHAZADO_CIERRE)
        .map((p) => ({ project: p, log: latestRejectionLog(auditLogs, p.id) }))
        .sort((a, b) => (b.log?.timestamp ?? "").localeCompare(a.log?.timestamp ?? "")),
    [projects, auditLogs],
  );

  const rejected = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRejected;
    return allRejected.filter(
      ({ project: p }) =>
        p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
    );
  }, [allRejected, query]);

  const columns: Column<(typeof rejected)[number]>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: ({ project: p }) => <span className="font-mono font-bold text-[10px] text-danger-600 whitespace-nowrap">{p.id}</span>,
    },
    {
      key: "title",
      label: "Título / Ubicación",
      width: "16rem",
      sortable: true,
      render: ({ project: p }) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{p.title}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate">{p.location}</div>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Motivo del rechazo",
      render: ({ log }) =>
        log ? (
          <p className="text-xs text-slate-600 leading-snug line-clamp-2">{log.details}</p>
        ) : (
          <span className="text-[11px] text-slate-400 italic">Motivo no disponible.</span>
        ),
    },
    {
      key: "timestamp",
      label: "Fecha",
      width: "9rem",
      sortable: true,
      render: ({ log }) => (
        <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{log?.timestamp ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "9.5rem",
      align: "right",
      sortable: false,
      render: ({ project: p }) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            id={`btn-view-${p.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewingProject(p);
            }}
            aria-label={`Ver petición ${p.title}`}
            title="Ver petición"
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            id={`btn-resubmit-${p.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingProject(p);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-danger-700 bg-white border border-danger-200 hover:bg-danger-500 hover:text-white hover:border-danger-500 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar y reenviar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <Card hoverable={false} accent="danger" fillHeight className="p-0 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 shrink-0">
          <SectionHeader
            icon={<XCircle className="h-5 w-5" />}
            title="Peticiones Rechazadas"
            description="Corrija lo indicado por Cierre de Obra y reenvíe para una nueva evaluación."
            color="rose"
          />
        </div>

        <TableToolbar
          searchId="rejected-petitions-search"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Buscar por título, ID o ubicación..."
          searchAriaLabel="Buscar peticiones rechazadas"
          countIcon={<XCircle />}
          filteredCount={rejected.length}
          totalCount={allRejected.length}
          noun="petición"
          nounPlural="peticiones"
          viewToggle={{ ...viewToggle, accent: "danger" }}
        />

        <AnimatePresence mode="wait">
          {viewMode === "table" ? (
            <motion.div key="table" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
              <Table
                columns={columns}
                data={rejected}
                rowKey={({ project: p }) => p.id}
                pageSize={pageSize}
                fillViewport
                stickyHeader
                onRowClick={({ project: p }) => setViewingProject(p)}
                emptyState={
                  <EmptyState
                    message={allRejected.length === 0 ? "No hay peticiones rechazadas." : "No hay peticiones que coincidan con la búsqueda."}
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          ) : (
            <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
              <GridView
                items={rejected}
                rowKey={({ project: p }) => p.id}
                renderCard={(row) => renderRejectedPetitionCard(row, setViewingProject, setEditingProject)}
                cardAccent={() => "danger"}
                onSelect={({ project: p }) => setViewingProject(p)}
                emptyState={
                  <EmptyState
                    message={allRejected.length === 0 ? "No hay peticiones rechazadas." : "No hay peticiones que coincidan con la búsqueda."}
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {editingProject && (
        <EditAndResubmitModal
          project={editingProject}
          materialsCatalog={materialsCatalog}
          authToken={authToken}
          onResubmitProject={onResubmitProject}
          onDeleteDocument={onDeleteDocument}
          onClose={() => setEditingProject(null)}
        />
      )}

      {viewingProject && (
        <RejectedPetitionDetailModal
          project={viewingProject}
          log={latestRejectionLog(auditLogs, viewingProject.id)}
          authToken={authToken}
          onClose={() => setViewingProject(null)}
        />
      )}
    </div>
  );
}
