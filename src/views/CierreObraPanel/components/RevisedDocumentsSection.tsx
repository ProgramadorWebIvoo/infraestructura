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
    documentType: "PLANO" | "CALC" | "FOTO",
    file: File,
  ) => void;
}

export default function RevisedDocumentsSection({ projects, authToken, onUploadDocumentVersion }: RevisedDocumentsSectionProps) {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [versionTarget, setVersionTarget] = useState<ProjectDocument | null>(null);
  const [versionFiles, setVersionFiles] = useState<File[]>([]);

  const revisedProjects = projects.filter((p) => p.status !== ProjectStatus.CREADO);
  const selectedProject = revisedProjects.find((p) => p.id === selectedId);

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
    <Card className="border-l-4 border-l-emerald-400">
      <SectionHeader
        icon={<FileStack className="h-5 w-5" />}
        title="Documentos Ya Revisados"
        description="Consulta el historial y sube correcciones de planos/cálculos sin perder las versiones anteriores."
        color="emerald"
      />

      {revisedProjects.length === 0 ? (
        <EmptyState message="No hay proyectos con documentación ya revisada." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 -mr-2">
            {revisedProjects.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <button
                  id={`revised-doc-select-${p.id}`}
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? "" : p.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 ring-2 ring-emerald-100 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50/50 hover:shadow-sm"
                  }`}
                >
                  <span className="font-mono text-[9px] font-bold text-emerald-600">{p.id}</span>
                  <div className="text-xs font-bold text-slate-800 line-clamp-1 mt-1">{p.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {p.location}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedProject && (
            <ProjectDocumentsList
              project={selectedProject}
              authToken={authToken}
              onDownload={handleDownload}
              onPreview={setPreviewDoc}
              onUploadNewVersion={setVersionTarget}
            />
          )}
        </div>
      )}

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
