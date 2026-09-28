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
import { CheckCircle2, CircleDashed, Download, Eye, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import IconActionButton from "@/components/UI/IconActionButton";
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

  const requiredRows = rows.filter((r) => r.isRequired);
  const requiredLoaded = requiredRows.filter((r) => r.document).length;
  const progress = requiredRows.length > 0 ? Math.round((requiredLoaded / requiredRows.length) * 100) : 100;

  return (
    <Card hoverable={false} className="p-4 bg-surface-raised">
      <div className="mb-3 space-y-2 border-b border-border-default pb-3">
        <div className="flex items-center justify-between gap-2">
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
        {!isLoading && requiredRows.length > 0 && (
          <div className="space-y-1">
            <div
              className="h-1.5 w-full overflow-hidden rounded-pill bg-slate-200"
              role="progressbar"
              aria-label="Documentos obligatorios cargados"
              aria-valuemin={0}
              aria-valuemax={requiredRows.length}
              aria-valuenow={requiredLoaded}
            >
              <div
                className={`h-full rounded-pill transition-all duration-300 ${progress === 100 ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] font-medium text-text-tertiary">
              {requiredLoaded} de {requiredRows.length} obligatorios cargados
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          <Spinner size="sm" /> Cargando documentos...
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const missingRequired = !row.document && row.isRequired;
            const rowStyle = row.document
              ? "border-border-default bg-white"
              : missingRequired
                ? `border-dashed ${warning.border200} ${warning.bg50}`
                : "border-dashed border-border-default bg-white/60";
            return (
              <li key={row.key} className={`flex flex-wrap items-center gap-3 rounded-control border px-3 py-2.5 transition-colors ${rowStyle}`}>
                <span className="shrink-0" aria-hidden="true">
                  {row.document ? (
                    <CheckCircle2 className={`h-5 w-5 ${success.text600}`} />
                  ) : (
                    <CircleDashed className={`h-5 w-5 ${missingRequired ? warning.text600 : "text-text-muted"}`} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-primary">
                    {row.label}
                    {row.isRequired && <span className="ml-1 text-danger-500" title="Obligatorio">*</span>}
                  </p>
                  {row.document ? (
                    <p className="truncate text-[11px] font-medium text-text-tertiary">
                      {row.document.originalName} · v{row.document.versionNumber} · {formatFileSize(row.document.sizeBytes)}
                    </p>
                  ) : (
                    <p className={`text-[11px] font-bold ${missingRequired ? warning.text700 : "text-text-muted"}`}>
                      {missingRequired ? "Faltante" : "Sin cargar"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {row.document && (
                    <>
                      <IconActionButton label={`Ver ${row.label}`} tooltip="Ver" tone="sky" onClick={() => setPreviewDoc(row.document!)} icon={<Eye className="h-3.5 w-3.5" />} />
                      <IconActionButton label={`Descargar ${row.label}`} tooltip="Descargar" tone="indigo" onClick={() => void handleDownload(row.document!)} icon={<Download className="h-3.5 w-3.5" />} />
                    </>
                  )}
                  {canManage && !row.document && (
                    <Button
                      variant="primary"
                      colorScheme="indigo"
                      size="sm"
                      aria-label={`Cargar ${row.label}`}
                      isLoading={busyTypeId === row.typeId}
                      disabled={busyTypeId !== null}
                      onClick={() => openFilePicker(row.typeId)}
                      icon={<Upload className="h-3 w-3" />}
                    >
                      Cargar
                    </Button>
                  )}
                  {canManage && row.document && (
                    <>
                      <IconActionButton
                        label={`Reemplazar ${row.label}`}
                        tooltip="Reemplazar (nueva versión)"
                        tone="amber"
                        isBusy={busyTypeId === row.typeId}
                        disabled={busyTypeId !== null}
                        onClick={() => openFilePicker(row.typeId)}
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                      />
                      <IconActionButton label={`Eliminar ${row.label}`} tooltip="Eliminar" tone="rose" onClick={() => setDeleteTarget(row.document!)} icon={<Trash2 className="h-3.5 w-3.5" />} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
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
