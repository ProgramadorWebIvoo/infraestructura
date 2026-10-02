import DocumentPreviewModal, { type PreviewableDocument } from "@/components/UI/DocumentPreviewModal";
import { useToast } from "@/components/UI/Toast";
import { apiDownload } from "@/services/api";
import { getErrorMessage } from "@/services/logger";
import { saveBlob } from "@/utils/saveBlob";

/** Archivo del cierre (foto o documento técnico) a previsualizar; las rutas son relativas a la API, sin "/" inicial. */
export interface ClosurePreviewTarget {
  id: number;
  originalName: string;
  path: string;
  mimeType?: string | null;
  /** Ruta de descarga si difiere de la de vista previa. */
  downloadPath?: string;
}

interface ClosureFilePreviewProps {
  target: ClosurePreviewTarget | null;
  authToken: string;
  onClose: () => void;
}

/** Previsualizador estándar (DocumentPreviewModal) para fotos y archivos del cierre, con descarga. */
export default function ClosureFilePreview({ target, authToken, onClose }: ClosureFilePreviewProps) {
  const { showToast } = useToast();

  const download = async (doc: PreviewableDocument) => {
    if (!target) return;
    try {
      const blob = await apiDownload(`/${target.downloadPath ?? target.path}`, { token: authToken, transferLabel: `Descargando «${doc.originalName}»` });
      saveBlob(blob, doc.originalName);
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo descargar el archivo."), "error");
    }
  };

  return (
    <DocumentPreviewModal
      isOpen={target !== null}
      onClose={onClose}
      projectId=""
      authToken={authToken}
      document={target ? { id: target.id, originalName: target.originalName, mimeType: target.mimeType ?? undefined } : null}
      previewPath={target ? `/${target.path}` : undefined}
      onDownload={download}
    />
  );
}
