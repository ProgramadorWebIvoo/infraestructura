/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de solo lectura: detalle completo de una petición rechazada — motivo,
 * observaciones y correcciones adjuntadas por Cierre de Obra. Distinto de
 * EditAndResubmitModal (RejectedPetitionsSection.tsx), que es el único punto
 * de edición/reenvío — este modal no muta nada.
 */

import { useState } from "react";
import { AlertTriangle, Eye, MessageSquareText, User } from "lucide-react";
import type { AuditLog, Project, ProjectDocument } from "../../../types";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import { apiDownload } from "../../../services/api";
import { useToast } from "../../../components/UI/Toast";

interface RejectedPetitionDetailModalProps {
  project: Project;
  log: AuditLog | undefined;
  authToken: string;
  onClose: () => void;
}

export default function RejectedPetitionDetailModal({ project, log, authToken, onClose }: RejectedPetitionDetailModalProps) {
  const { showToast } = useToast();
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  const corrections = (project.documents ?? []).filter((d) => d.documentType === "CORRECCION");

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      const blob = await apiDownload(`/projects/${project.id}/documents/${doc.id}/download`, { token: authToken });
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

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-2xl"
      icon={<Eye className="h-5 w-5" />}
      iconColor="rose"
      badge="Detalle de Petición Rechazada"
      title={project.id}
      infoLine={project.title}
      footer={
        <div className="flex items-center justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-danger-600">
            Motivo del rechazo
          </label>
          {log ? (
            <div className="flex items-start gap-1.5 text-xs text-danger-700 bg-danger-50 rounded-xl border border-danger-100 px-3.5 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium leading-relaxed">{log.details}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <User className="h-3 w-3" />
                  {log.userName ?? "Cierre de Obra"} · {log.timestamp}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">Motivo no disponible.</p>
          )}
        </div>

        {log?.observations && (
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Observaciones
            </label>
            <div className="flex items-start gap-1.5 text-xs text-slate-700 bg-slate-50 rounded-xl border border-slate-100 px-3.5 py-2.5">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
              <p className="font-medium leading-relaxed">{log.observations}</p>
            </div>
          </div>
        )}

        {corrections.length > 0 && (
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Correcciones adjuntadas por Cierre de Obra
            </label>
            <ProjectDocumentsList
              project={{ ...project, documents: corrections }}
              authToken={authToken}
              onDownload={handleDownload}
              onPreview={setPreviewDoc}
            />
          </div>
        )}
      </div>

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        projectId={project.id}
        document={previewDoc}
        authToken={authToken}
        onDownload={handleDownload}
      />
    </Modal>
  );
}
