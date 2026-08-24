/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 3 de Cierre de Obra: documentos de proyectos ya revisados (más
 * allá de CREADO), donde se puede consultar el historial y subir una nueva
 * versión de un plano/cálculo/foto sin reemplazarlo físicamente (V1→V2→V3).
 * Cierre de Obra es el dueño natural de la documentación técnica.
 */

import { useState } from "react";
import { FileStack, MapPin, Upload } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import FileDropZone from "../../../components/UI/FileDropZone";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import StatusBadge from "../../../components/UI/StatusBadge";
import { Table, type Column } from "../../../components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { apiDownload } from "../../../services/api";
import { useToast } from "../../../components/UI/Toast";
import { ProjectStatus } from "../../../types";
import type { Project, ProjectDocument } from "../../../types";

interface RevisedDocumentsSectionProps {
  projects: Project[];
  authToken: string;
  onUploadDocumentVersion: (
    projectId: string,
    documentId: number,
    documentType: "PLANO" | "CALC" | "FOTO" | "CORRECCION",
    file: File,
  ) => void;
}

const success = SEMANTIC_COLOR_MAP.success;

export default function RevisedDocumentsSection({ projects, authToken, onUploadDocumentVersion }: RevisedDocumentsSectionProps) {
  const { showToast } = useToast();
  const { containerRef } = useContainerRows({ paginated: false });
  const [selectedId, setSelectedId] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [versionTarget, setVersionTarget] = useState<ProjectDocument | null>(null);
  const [versionFiles, setVersionFiles] = useState<File[]>([]);

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
      const blob = await apiDownload(`/projects/${selectedProject.id}/documents/${doc.id}/download`, { token: authToken });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  const closeVersionModal = () => {
    setVersionTarget(null);
    setVersionFiles([]);
  };

  const handleSubmitVersion = () => {
    if (!selectedProject || !versionTarget || versionFiles.length === 0) return;
    onUploadDocumentVersion(selectedProject.id, versionTarget.id, versionTarget.documentType, versionFiles[0]);
    closeVersionModal();
  };

  return (
    <Card accent="success" className="min-h-0 flex-1" fillHeight>
      <SectionHeader
        icon={<FileStack className="h-5 w-5" />}
        title="Documentos Ya Revisados"
        description="Consulta el historial y sube correcciones de planos/cálculos sin perder las versiones anteriores."
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
            authToken={authToken}
            onDownload={handleDownload}
            onPreview={setPreviewDoc}
            onUploadNewVersion={setVersionTarget}
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

      <Modal
        isOpen={!!versionTarget}
        onClose={closeVersionModal}
        title="Subir Nueva Versión"
        infoLine={versionTarget?.originalName}
        icon={<Upload className="h-5 w-5" />}
        iconColor="emerald"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeVersionModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              colorScheme="emerald"
              onClick={handleSubmitVersion}
              disabled={versionFiles.length === 0}
              icon={<Upload className="h-3.5 w-3.5" />}
            >
              Subir versión
            </Button>
          </div>
        }
      >
        {versionTarget && (
          <FileDropZone
            files={versionFiles}
            onFilesChange={(files) => setVersionFiles(files.slice(-1))}
            label="Archivo de la nueva versión"
            accept={versionTarget.documentType === "FOTO" ? ".png,.jpg,.jpeg,.webp" : ".pdf,.png,.jpg,.jpeg,.svg,.tiff,.tif,.dwg,.dxf"}
            extensionsLabel={versionTarget.documentType === "FOTO" ? "PNG, JPG, JPEG, WEBP" : "PDF, PNG, JPG, SVG, TIFF, DWG, DXF"}
            color="emerald"
            onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "warning")}
          />
        )}
      </Modal>
    </Card>
  );
}
