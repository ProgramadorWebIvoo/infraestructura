/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 3 de Cierre de Obra: documentos de proyectos ya revisados (más
 * allá de CREADO) — consulta de solo lectura (preview + descarga). No
 * permite subir nuevas versiones: el versionado (V1→V2) existe únicamente
 * como trazabilidad del ciclo rechazo→corrección→reenvío de Infraestructura
 * (ver useProjectsWorkflows::handleResubmitProject), no como una acción
 * libre sobre cualquier documento ya revisado.
 */

import { useState } from "react";
import { FileStack, MapPin } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import StatusBadge from "../../../components/UI/StatusBadge";
import { Table, type Column } from "../../../components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { downloadProjectDocument } from "../../../services/api";
import { useToast } from "../../../components/UI/Toast";
import { ProjectStatus } from "../../../types";
import type { Project, ProjectDocument } from "../../../types";

interface RevisedDocumentsSectionProps {
  projects: Project[];
  authToken: string;
}

const success = SEMANTIC_COLOR_MAP.success;

export default function RevisedDocumentsSection({ projects, authToken }: RevisedDocumentsSectionProps) {
  const { showToast } = useToast();
  const { containerRef } = useContainerRows({ paginated: false });
  const [selectedId, setSelectedId] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  const revisedProjects = projects.filter((p) => p.status !== ProjectStatus.CREADO);
  const selectedProject = revisedProjects.find((p) => p.id === selectedId);

  const columns: Column<Project>[] = [
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
      key: "status",
      label: "Estado",
      width: "9rem",
      sortable: true,
      render: (p) => <StatusBadge code={p.status} />,
    },
    {
      key: "documents",
      label: "Adjuntos",
      width: "6rem",
      align: "right",
      render: (p) => <span className="font-mono text-[11px] font-bold text-slate-600">{p.documents?.length ?? 0}</span>,
    },
  ];

  const handleDownload = async (doc: ProjectDocument) => {
    if (!selectedProject) return;
    try {
      await downloadProjectDocument(selectedProject.id, doc, authToken);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  return (
    <Card accent="success" className="min-h-0 flex-1" fillHeight>
      <SectionHeader
        icon={<FileStack className="h-5 w-5" />}
        title="Documentos Ya Revisados"
        description="Consulta los adjuntos de proyectos que ya pasaron por revisión técnica."
        color="emerald"
      />

      {revisedProjects.length === 0 ? (
        <EmptyState message="No hay proyectos con documentación ya revisada." />
      ) : (
        <div ref={containerRef} className="flex-1 min-h-0">
          <Table
            columns={columns}
            data={revisedProjects}
            rowKey={(p) => p.id}
            fillViewport
            onRowClick={(p) => setSelectedId(p.id)}
            selectedRowKey={selectedId}
          />
        </div>
      )}

      {/* ── Modal de documentos del expediente seleccionado ── */}
      <Modal
        isOpen={!!selectedProject}
        onClose={() => setSelectedId("")}
        maxWidth="max-w-3xl"
        icon={<FileStack className="h-5 w-5" />}
        iconColor="emerald"
        badge="Documentos Ya Revisados"
        title={selectedProject ? `Expediente ${selectedProject.id}` : ""}
        infoLine={selectedProject ? `${selectedProject.title} · ${selectedProject.location}` : ""}
      >
        {selectedProject && (
          <ProjectDocumentsList
            project={selectedProject}
            onDownload={handleDownload}
            onPreview={setPreviewDoc}
          />
        )}
      </Modal>

      {selectedProject && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          projectId={selectedProject.id}
          document={previewDoc}
          authToken={authToken}
          onDownload={handleDownload}
        />
      )}
    </Card>
  );
}
