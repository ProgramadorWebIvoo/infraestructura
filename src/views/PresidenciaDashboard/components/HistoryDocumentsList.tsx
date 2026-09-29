/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lista reutilizable de documentos versionados del Histórico de Obras
 * (planos/cálculos/correcciones en "Planos y cierre", fotos/reevaluación en
 * "Presupuesto y solicitud") — mismo esquema `HistoryDrawing`, misma
 * descarga y previsualización (DocumentPreviewModal, igual que el resto de
 * la app) para no duplicar ese visor.
 */

import { useState } from "react";
import { Download, Eye } from "lucide-react";
import DocumentPreviewModal, { type PreviewableDocument } from "@/components/UI/DocumentPreviewModal";
import { useToast } from "@/components/UI/Toast";
import { downloadProjectDocument } from "@/services/api";
import type { HistoryDrawing, HistoryDrawingVersion } from "../projectHistoryTypes";

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PLANO: "Plano",
  CALC: "Cálculo",
  CORRECCION: "Corrección",
  FOTO: "Foto de sitio",
  REEVALUACION: "Evidencia de reevaluación",
};

/** Descarga un documento del histórico (comprobante, plano, foto, etc.) mostrando un toast si falla. */
export function useHistoryDocumentDownload(projectId: string, authToken: string) {
  const { showToast } = useToast();
  return async (doc: { id: number; name: string }) => {
    try {
      await downloadProjectDocument(projectId, { id: doc.id, originalName: doc.name }, authToken);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };
}

const toPreviewable = (v: HistoryDrawingVersion): PreviewableDocument => ({ id: v.id, originalName: v.name, versionNumber: v.version });

function HistoryDocumentCard({ drawing, onDownload, onPreview }: {
  drawing: HistoryDrawing;
  onDownload: (doc: { id: number; name: string }) => void;
  onPreview: (v: HistoryDrawingVersion) => void;
}) {
  return (
    <li className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="text-xs font-semibold text-text-primary">
        {DOCUMENT_TYPE_LABELS[drawing.type] ?? drawing.type} · {drawing.name}
        <span className="ml-2 text-[11px] text-text-tertiary font-mono">vigente: V{drawing.currentVersion ?? "—"}</span>
      </p>
      <ol className="mt-1 space-y-0.5">
        {drawing.versions.map((v) => (
          <li key={v.id} className={`flex items-center gap-1.5 text-[11px] font-mono ${v.isDeleted ? "line-through text-text-tertiary" : "text-text-secondary"}`}>
            <span>V{v.version} · {v.name} · {v.uploadedBy ?? "—"} · {v.uploadedAt?.slice(0, 10) ?? "—"}{v.isDeleted ? " (eliminada)" : ""}</span>
            {!v.isDeleted && (
              <>
                <button
                  type="button"
                  onClick={() => onPreview(v)}
                  aria-label={`Ver V${v.version} de ${v.name}`}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Eye className="h-3 w-3" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDownload({ id: v.id, name: v.name })}
                  aria-label={`Descargar V${v.version} de ${v.name}`}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
      </ol>
    </li>
  );
}

export function HistoryDocumentsList({ documents, emptyMessage, projectId, authToken }: {
  documents: HistoryDrawing[];
  emptyMessage: string;
  projectId: string;
  authToken: string;
}) {
  const onDownload = useHistoryDocumentDownload(projectId, authToken);
  const [previewVersion, setPreviewVersion] = useState<HistoryDrawingVersion | null>(null);

  return (
    <>
      {documents.length === 0 ? (
        <p className="text-xs text-text-tertiary">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">{documents.map((d) => <HistoryDocumentCard key={d.groupId} drawing={d} onDownload={onDownload} onPreview={setPreviewVersion} />)}</ul>
      )}

      <DocumentPreviewModal
        isOpen={previewVersion !== null}
        onClose={() => setPreviewVersion(null)}
        projectId={projectId}
        document={previewVersion ? toPreviewable(previewVersion) : null}
        authToken={authToken}
        onDownload={(doc) => onDownload({ id: doc.id, name: doc.originalName })}
      />
    </>
  );
}
