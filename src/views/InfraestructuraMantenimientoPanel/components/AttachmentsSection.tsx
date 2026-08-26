/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paso 3 del wizard de alta de petición: fotos, documentos y planos
 * adjuntos al registro. Sin Card/SectionHeader propios — contenido puro
 * de paso, montado dentro de RequestWizardCard. Se exige al menos un
 * archivo entre los 3 grupos (no un grupo específico) — validado en
 * useRequestForm::validateAdjuntosStep.
 *
 * Modo edición (existingDocuments presente): además del punto de carga para
 * archivos nuevos, lista los adjuntos ya persistidos del proyecto (subidos
 * en el envío original) vía ProjectDocumentsList en mode="manage" — cada
 * fila tiene su propio botón "Subir nueva versión" (vincula el archivo
 * explícitamente a ESE documento vía new_version_of, sin la inferencia
 * automática que había antes) y "Eliminar" (reversible hasta confirmar el
 * reenvío, ver useRequestForm::markDocumentForDeletion).
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Paperclip } from "lucide-react";
import FileDropZone from "../../../components/UI/FileDropZone";
import AlertBanner from "../../../components/UI/AlertBanner";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import { useAppGroupSettings } from "../../../hooks/useAppGroupSettings";
import { useToast } from "../../../components/UI/Toast";
import { downloadProjectDocument } from "../../../services/api";
import { bannerVariants } from "../../../animations";
import type { Project, ProjectDocument } from "../../../types";

interface AttachmentsSectionProps {
  photoFiles: File[];
  onPhotoFilesChange: (files: File[]) => void;
  documentFiles: File[];
  onDocumentFilesChange: (files: File[]) => void;
  planFiles: File[];
  onPlanFilesChange: (files: File[]) => void;
  error?: string;
  /** Modo edición: proyecto siendo reenviado (para preview/descarga) + adjuntos ya vivos. */
  existingProjectId?: string;
  existingDocuments?: ProjectDocument[];
  markedForDeletion?: Set<number>;
  onToggleDeletion?: (documentId: number) => void;
  onRequestNewVersion?: (doc: ProjectDocument, file: File) => void;
  pendingReplacementFor?: (documentId: number) => File | undefined;
  onClearReplacement?: (documentId: number) => void;
  authToken?: string;
}

export default function AttachmentsSection({
  photoFiles,
  onPhotoFilesChange,
  documentFiles,
  onDocumentFilesChange,
  planFiles,
  onPlanFilesChange,
  error,
  existingProjectId,
  existingDocuments,
  markedForDeletion,
  onToggleDeletion,
  onRequestNewVersion,
  pendingReplacementFor,
  onClearReplacement,
  authToken,
}: AttachmentsSectionProps) {
  const { maxFileSizeBytes } = useAppGroupSettings();
  const { showToast } = useToast();
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  const onFileRejected = (name: string, reason: string) => showToast(`${name}: ${reason}`, "warning");

  const handleDownload = async (doc: ProjectDocument) => {
    if (!existingProjectId || !authToken) return;
    try {
      await downloadProjectDocument(existingProjectId, doc, authToken);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  const hasExistingSection = !!existingProjectId && !!existingDocuments;
  // Las correcciones que Cierre de Obra adjuntó al rechazar no se muestran
  // en este paso — no aportan valor acá (el usuario ya las revisó en el
  // detalle de la petición rechazada). Solo se listan los adjuntos propios
  // (FOTO/CALC/PLANO), que además son los únicos eliminables/versionables.
  const ownDocuments = (existingDocuments ?? []).filter((d) => d.documentType !== "CORRECCION");

  return (
    <div>
      <AnimatePresence>
        {error && (
          <motion.div variants={bannerVariants} initial="hidden" animate="visible" exit="exit" className="mb-4">
            <AlertBanner type="error" message={error} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />
          </motion.div>
        )}
      </AnimatePresence>

      {hasExistingSection && ownDocuments.length > 0 && (
        <div className="mb-5">
          <h5 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            <Paperclip className="h-3.5 w-3.5" />
            Adjuntos ya cargados
          </h5>
          <ProjectDocumentsList
            project={{ id: existingProjectId, documents: ownDocuments } as Project}
            onDownload={handleDownload}
            onPreview={setPreviewDoc}
            onDelete={(doc) => onToggleDeletion?.(doc.id)}
            markedForDeletion={markedForDeletion}
            mode="manage"
            onRequestNewVersion={onRequestNewVersion}
            pendingReplacementFor={pendingReplacementFor}
            onClearReplacement={onClearReplacement}
          />
        </div>
      )}

      {hasExistingSection && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          projectId={existingProjectId!}
          document={previewDoc}
          authToken={authToken ?? ""}
          onDownload={handleDownload}
        />
      )}

      <h5 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        <Paperclip className="h-3.5 w-3.5" />
        {hasExistingSection ? "Cargar Adjuntos Nuevos" : "Cargar Adjuntos"}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileDropZone
          id="attachments-photos"
          files={photoFiles}
          onFilesChange={onPhotoFilesChange}
          label="Fotos del Sitio"
          accept=".png,.jpg,.jpeg,.webp"
          extensionsLabel="PNG, JPG, JPEG, WEBP"
          color="purple"
          maxSizeBytes={maxFileSizeBytes}
          onFileRejected={onFileRejected}
          compact={hasExistingSection}
        />
        <FileDropZone
          id="attachments-documents"
          files={documentFiles}
          onFilesChange={onDocumentFilesChange}
          label="Hojas de Cálculo"
          accept=".pdf,.xlsx,.xls,.csv,.ods"
          extensionsLabel="PDF, XLSX, XLS, CSV, ODS"
          color="indigo"
          maxSizeBytes={maxFileSizeBytes}
          onFileRejected={onFileRejected}
          compact={hasExistingSection}
        />
        <FileDropZone
          id="attachments-plans"
          files={planFiles}
          onFilesChange={onPlanFilesChange}
          label="Planos de Ingeniería"
          accept=".pdf,.png,.jpg,.jpeg,.svg,.tiff,.tif,.dwg,.dxf"
          extensionsLabel="PDF, PNG, JPG, SVG, TIFF, DWG, DXF"
          color="sky"
          maxSizeBytes={maxFileSizeBytes}
          onFileRejected={onFileRejected}
          compact={hasExistingSection}
        />
      </div>
    </div>
  );
}
