/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Peticiones rechazadas por Cierre de Obra: muestra dónde/por qué/qué se
 * rechazó (motivo desde AuditLog, sin columna propia — mismo criterio que
 * RejectionService::buildDetails) y permite editar y reenviar la misma
 * petición (mismo Project.id) para una nueva evaluación, sin crear una
 * petición nueva. Se autoculta si no hay ninguna rechazada.
 *
 * Usa el sistema de tabla compartido (Table/Column), igual que
 * RequestsTableSection — antes era una lista de cards apiladas, inconsistente
 * con el resto de la app, que sí usa tablas para listados de peticiones.
 */

import { Eye, Pencil, SearchX, XCircle } from "lucide-react";
import type { AuditLog, Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Modal from "../../../components/UI/Modal";
import EmptyState from "../../../components/UI/EmptyState";
import { Table, type Column } from "../../../components/UI/Table";
import RequestWizardCard from "./RequestWizardCard";
import RejectedPetitionDetailModal from "./RejectedPetitionDetailModal";
import { useRequestForm } from "../../../hooks/useRequestForm";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useToast } from "../../../components/UI/Toast";
import { useState } from "react";

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
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
}

function latestRejectionLog(auditLogs: AuditLog[], projectId: string): AuditLog | undefined {
  return auditLogs
    .filter((l) => l.projectId === projectId && l.action === REJECT_ACTION)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function EditAndResubmitModal({
  project,
  materialsCatalog,
  onResubmitProject,
  onClose,
}: {
  project: Project;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  onResubmitProject: RejectedPetitionsSectionProps["onResubmitProject"];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const form = useRequestForm({
    onAddProject: async () => ({ ok: false, partial: false, failedGroups: [] }),
    existingProject: project,
    onResubmitProject: async (...args) => {
      const result = await onResubmitProject(...args);
      if (result.ok) {
        showToast("Petición corregida y reenviada a Cierre de Obra.", "success");
        onClose();
      }
      return result;
    },
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
        <RequestWizardCard form={form} materialsCatalog={materialsCatalog} variant="embedded" />
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
}: RejectedPetitionsSectionProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const { containerRef, rows: pageSize } = useContainerRows();

  const rejected = projects
    .filter((p) => p.status === ProjectStatus.RECHAZADO_CIERRE)
    .map((p) => ({ project: p, log: latestRejectionLog(auditLogs, p.id) }))
    .sort((a, b) => (b.log?.timestamp ?? "").localeCompare(a.log?.timestamp ?? ""));

  if (rejected.length === 0) return null;

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

        <div ref={containerRef} className="flex-1 min-h-0">
          <Table
            columns={columns}
            data={rejected}
            rowKey={({ project: p }) => p.id}
            pageSize={pageSize}
            fillViewport
            onRowClick={({ project: p }) => setViewingProject(p)}
            containerClassName="px-6 pb-6"
            emptyState={<EmptyState message="No hay peticiones rechazadas." icon={<SearchX className="h-8 w-8" />} />}
          />
        </div>
      </Card>

      {editingProject && (
        <EditAndResubmitModal
          project={editingProject}
          materialsCatalog={materialsCatalog}
          onResubmitProject={onResubmitProject}
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
