/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paso 3 del wizard de alta de petición: fotos, documentos y planos
 * adjuntos al registro. Sin Card/SectionHeader propios — contenido puro
 * de paso, montado dentro de RequestWizardCard. Se exige al menos un
 * archivo entre los 3 grupos (no un grupo específico) — validado en
 * useRequestForm::validateAdjuntosStep.
 */

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import FileDropZone from "../../../components/UI/FileDropZone";
import AlertBanner from "../../../components/UI/AlertBanner";
import { useAppGroupSettings } from "../../../hooks/useAppGroupSettings";
import { useToast } from "../../../components/UI/Toast";
import { bannerVariants } from "../../../animations";

interface AttachmentsSectionProps {
  photoFiles: File[];
  onPhotoFilesChange: (files: File[]) => void;
  documentFiles: File[];
  onDocumentFilesChange: (files: File[]) => void;
  planFiles: File[];
  onPlanFilesChange: (files: File[]) => void;
  error?: string;
}

export default function AttachmentsSection({
  photoFiles,
  onPhotoFilesChange,
  documentFiles,
  onDocumentFilesChange,
  planFiles,
  onPlanFilesChange,
  error,
}: AttachmentsSectionProps) {
  const { maxFileSizeBytes } = useAppGroupSettings();
  const { showToast } = useToast();

  const onFileRejected = (name: string, reason: string) => showToast(`${name}: ${reason}`, "warning");

  return (
    <div>
      <AnimatePresence>
        {error && (
          <motion.div variants={bannerVariants} initial="hidden" animate="visible" exit="exit" className="mb-4">
            <AlertBanner type="error" message={error} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileDropZone
          id="attachments-photos"
          files={photoFiles}
          onFilesChange={onPhotoFilesChange}
          label="Fotos del sitio"
          accept=".png,.jpg,.jpeg,.webp"
          extensionsLabel="PNG, JPG, JPEG, WEBP"
          color="purple"
          maxSizeBytes={maxFileSizeBytes}
          onFileRejected={onFileRejected}
        />
        <FileDropZone
          id="attachments-documents"
          files={documentFiles}
          onFilesChange={onDocumentFilesChange}
          label="Documentos / cubicaciones"
          accept=".pdf,.xlsx,.xls,.csv,.ods"
          extensionsLabel="PDF, XLSX, XLS, CSV, ODS"
          color="indigo"
          maxSizeBytes={maxFileSizeBytes}
          onFileRejected={onFileRejected}
        />
        <FileDropZone
          id="attachments-plans"
          files={planFiles}
          onFilesChange={onPlanFilesChange}
          label="Planos de ingeniería"
          accept=".pdf,.png,.jpg,.jpeg,.svg,.tiff,.tif,.dwg,.dxf"
          extensionsLabel="PDF, PNG, JPG, SVG, TIFF, DWG, DXF"
          color="sky"
          maxSizeBytes={maxFileSizeBytes}
          onFileRejected={onFileRejected}
        />
      </div>
    </div>
  );
}
