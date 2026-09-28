/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección "Documentos" de un proveedor (F4 Bloque A): lista por tipo con
 * estado cargado/faltante, descarga, vista previa y — solo para roles con
 * permiso — carga, reemplazo y eliminación. Compartida por
 * ContractorDetailModal (configuración) y SupplierDetailModal (consulta).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import Spinner from "@/components/UI/Spinner";
import ConfirmDialog from "@/components/UI/ConfirmDialog";
import DocumentPreviewModal from "@/components/UI/DocumentPreviewModal";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useToast } from "@/components/UI/Toast";
import { useContractorDocumentTypes } from "@/hooks/useContractorDocumentTypes";
import { getErrorMessage, logError } from "@/services/logger";
import { formatFileSize } from "@/utils";
import {
  CONTRACTOR_DOCUMENT_ACCEPT,
  CONTRACTOR_DOCUMENT_MAX_BYTES,
  canManageContractorDocuments,
  contractorDocumentPath,
  deleteContractorDocument,
  downloadContractorDocument,
  fetchContractorDocuments,
  uploadContractorDocument,
  type ContractorDocument,
  type ContractorDocumentCompleteness,
} from "@/services/contractorDocuments";

interface ContractorDocumentsSectionProps {
  contractorCode: string;
  authToken: string;
  activeRole?: string;
}

interface DocumentRow {
  key: string;
  typeId: number;
  label: string;
  isRequired: boolean;
  document?: ContractorDocument;
}

export default function ContractorDocumentsSection({ contractorCode, authToken, activeRole }: ContractorDocumentsSectionProps) {
  const { showToast } = useToast();
  const { types } = useContractorDocumentTypes();
  const canManage = canManageContractorDocuments(activeRole);
  const [documents, setDocuments] = useState<ContractorDocument[]>([]);
  const [completeness, setCompleteness] = useState<ContractorDocumentCompleteness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [busyTypeId, setBusyTypeId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ContractorDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractorDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTypeRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchContractorDocuments(contractorCode, authToken);
      setDocuments(res.documents ?? []);
      setCompleteness(res.completeness);
      setIsForbidden(false);
    } catch (error) {
      if ((error as { status?: number }).status === 403) {
        setIsForbidden(true);
      } else {
        logError("ContractorDocumentsSection.load", error);
        showToast("No se pudieron cargar los documentos del proveedor.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [contractorCode, authToken, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<DocumentRow[]>(() => {
    const byType = new Map(documents.map((d) => [d.documentTypeId, d]));
    const fromTypes = types.map((t) => ({ key: `t-${t.id}`, typeId: t.id, label: t.label, isRequired: t.isRequired, document: byType.get(t.id) }));
    const knownTypeIds = new Set(types.map((t) => t.id));
    const orphans = documents
      .filter((d) => !knownTypeIds.has(d.documentTypeId))
      .map((d) => ({ key: `d-${d.id}`, typeId: d.documentTypeId, label: d.documentTypeLabel ?? "Documento", isRequired: false, document: d }));
    return [...fromTypes, ...orphans];
  }, [documents, types]);

  if (isForbidden) return null;

  const success = SEMANTIC_COLOR_MAP.success;
  const warning = SEMANTIC_COLOR_MAP.warning;

  const openFilePicker = (typeId: number) => {
    uploadTypeRef.current = typeId;
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (file: File | undefined) => {
    const typeId = uploadTypeRef.current;
    if (!file || typeId === null) return;
    if (file.size > CONTRACTOR_DOCUMENT_MAX_BYTES) {
      showToast("El archivo supera el tamaño máximo permitido.", "warning");
      return;
    }
    setBusyTypeId(typeId);
    try {
      await uploadContractorDocument(contractorCode, typeId, file, authToken);
      showToast("Documento guardado correctamente.", "success");
      await load();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo guardar el documento."), "error");
    } finally {
      setBusyTypeId(null);
      uploadTypeRef.current = null;
    }
  };

  const handleDownload = async (doc: ContractorDocument) => {
    try {
      await downloadContractorDocument(contractorCode, doc, authToken);
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo descargar el documento."), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteContractorDocument(contractorCode, deleteTarget.id, authToken);
      showToast("Documento eliminado correctamente.", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error, "No se pudo eliminar el documento."), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card hoverable={false} className="p-4 bg-surface-raised">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border-200 pb-2">
        <div className="flex items-center gap-2 text-brand-600">
          <FileText className="h-4 w-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Documentos</h3>
        </div>
        {completeness && (
          <span
            className={`rounded-pill border px-2.5 py-0.5 text-[10px] font-bold ${
              completeness.complete
                ? `${success.border100} ${success.bg50} ${success.text700}`
                : `${warning.border100} ${warning.bg50} ${warning.text700}`
            }`}
          >
            {completeness.complete ? "Documentación completa" : "Documentación incompleta"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          <Spinner size="sm" /> Cargando documentos...
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-200 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary">
                  {row.label}
                  {row.isRequired && <span className="ml-1 text-danger-500">*</span>}
                </p>
                {row.document ? (
                  <p className="truncate text-[11px] font-medium text-text-tertiary">
                    {row.document.originalName} · v{row.document.versionNumber} · {formatFileSize(row.document.sizeBytes)}
                  </p>
                ) : (
                  <p className={`text-[11px] font-bold ${row.isRequired ? warning.text700 : "text-text-muted"}`}>
                    {row.isRequired ? "Faltante" : "Sin cargar"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {row.document && (
                  <>
                    <Button variant="secondary" size="sm" aria-label={`Ver ${row.label}`} onClick={() => setPreviewDoc(row.document!)} icon={<Eye className="h-3 w-3" />} />
                    <Button variant="secondary" size="sm" aria-label={`Descargar ${row.label}`} onClick={() => void handleDownload(row.document!)} icon={<Download className="h-3 w-3" />} />
                  </>
                )}
                {canManage && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`${row.document ? "Reemplazar" : "Cargar"} ${row.label}`}
                      isLoading={busyTypeId === row.typeId}
                      disabled={busyTypeId !== null}
                      onClick={() => openFilePicker(row.typeId)}
                      icon={row.document ? <RefreshCw className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                    >
                      {row.document ? "Reemplazar" : "Cargar"}
                    </Button>
                    {row.document && (
                      <Button variant="secondary" size="sm" aria-label={`Eliminar ${row.label}`} onClick={() => setDeleteTarget(row.document!)} icon={<Trash2 className="h-3 w-3" />} />
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={CONTRACTOR_DOCUMENT_ACCEPT}
        className="hidden"
        data-testid="contractor-document-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleFileChosen(file);
        }}
      />

      <DocumentPreviewModal
        isOpen={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        projectId={contractorCode}
        document={previewDoc}
        authToken={authToken}
        previewPath={previewDoc ? contractorDocumentPath(contractorCode, previewDoc.id) : undefined}
        onDownload={(doc) => void handleDownload(doc)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar documento"
        message={`¿Eliminar «${deleteTarget?.documentTypeLabel ?? "este documento"}» y todas sus versiones?`}
        variant="danger"
        confirmLabel="Eliminar"
        isLoading={isDeleting}
      />
    </Card>
  );
}
