/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Listado genérico de los documentos (planos/hojas de cálculo/fotos) de un
 * proyecto — extraído del `ProjectDocuments` interno de
 * `InvestmentApprovalSection.tsx` (Procura) para reutilizarlo en la nueva
 * sección de Cierre de Obra, que además necesita badge de versión, botón de
 * previsualizar, e historial expandible (Procura solo usaba descarga).
 */

import { AlertTriangle, Download, Eye, FileSpreadsheet, Image as ImageIcon, Map, Undo2, X } from "lucide-react";
import type { Project, ProjectDocument } from "../../types";
import Tooltip from "./Tooltip";

interface ProjectDocumentsListProps {
  project: Project;
  authToken: string;
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  /** Solo se pasa desde Cierre de Obra — Procura no sube nuevas versiones. */
  onUploadNewVersion?: (doc: ProjectDocument) => void;
  /** Marca/desmarca un documento para eliminar — el consumidor decide si es
   * inmediato o reversible (ver useRequestForm::markDocumentForDeletion, que
   * lo aplica recién al confirmar el reenvío). Cuando se provee, cada fila
   * muestra un botón de eliminar/deshacer en vez de nada. */
  onDelete?: (doc: ProjectDocument) => void;
  /** IDs marcados para eliminar — esas filas se muestran tachadas con opción de deshacer. */
  markedForDeletion?: Set<number>;
}

const ACCENT_CLASSES = {
  indigo: { border: "border-indigo-100", bg: "bg-indigo-50/40", icon: "text-indigo-500", label: "text-indigo-700" },
  sky: { border: "border-sky-100", bg: "bg-sky-50/40", icon: "text-sky-500", label: "text-sky-700" },
  purple: { border: "border-purple-100", bg: "bg-purple-50/40", icon: "text-purple-500", label: "text-purple-700" },
  rose: { border: "border-rose-100", bg: "bg-rose-50/40", icon: "text-rose-500", label: "text-rose-700" },
} as const;

const GROUPS: { type: ProjectDocument["documentType"]; label: string; icon: typeof Map; accent: keyof typeof ACCENT_CLASSES }[] = [
  { type: "PLANO", label: "Planos de Ingeniería", icon: Map, accent: "indigo" },
  { type: "CALC", label: "Hojas de Cálculo", icon: FileSpreadsheet, accent: "sky" },
  { type: "FOTO", label: "Fotos del Sitio", icon: ImageIcon, accent: "purple" },
  { type: "CORRECCION", label: "Correcciones de Cierre de Obra", icon: AlertTriangle, accent: "rose" },
];

function DocumentRow({
  doc,
  onDownload,
  onPreview,
  onUploadNewVersion,
  onDelete,
  isMarkedForDeletion,
}: {
  doc: ProjectDocument;
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  onUploadNewVersion?: (doc: ProjectDocument) => void;
  onDelete?: (doc: ProjectDocument) => void;
  isMarkedForDeletion?: boolean;
}) {
  return (
    <li className={`border rounded-xl px-3 py-2.5 ${isMarkedForDeletion ? "bg-danger-50/60 border-danger-100" : "bg-white border-slate-100"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <span className={`text-xs font-bold truncate ${isMarkedForDeletion ? "text-slate-400 line-through" : "text-slate-800"}`} title={doc.originalName}>
            {doc.originalName}
          </span>
          {doc.versionNumber > 1 && (
            <span className="shrink-0 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              V{doc.versionNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isMarkedForDeletion ? (
            onDelete && (
              <button type="button" onClick={() => onDelete(doc)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors cursor-pointer whitespace-nowrap">
                <Undo2 className="h-4 w-4" />
                Deshacer
              </button>
            )
          ) : (
            <>
              <Tooltip content="Ver">
                <button type="button" onClick={() => onPreview(doc)} aria-label="Ver" className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer">
                  <Eye className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Descargar">
                <button type="button" onClick={() => onDownload(doc)} aria-label="Descargar" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Download className="h-4 w-4" />
                </button>
              </Tooltip>
              {onUploadNewVersion && (
                <button
                  type="button"
                  onClick={() => onUploadNewVersion(doc)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Nueva versión
                </button>
              )}
              {onDelete && (
                <Tooltip content="Eliminar">
                  <button type="button" onClick={() => onDelete(doc)} aria-label="Eliminar" className="p-2 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ProjectDocumentsList({ project, authToken: _authToken, onDownload, onPreview, onUploadNewVersion, onDelete, markedForDeletion }: ProjectDocumentsListProps) {
  const docs = project.documents ?? [];
  if (docs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {GROUPS.map(({ type, label, icon: Icon, accent }) => {
        const items = docs.filter((d) => d.documentType === type);
        const c = ACCENT_CLASSES[accent];
        return (
          <div key={type} className={`rounded-xl border ${c.border} ${c.bg} p-3 space-y-2`}>
            <div className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${c.icon} shrink-0`} />
              <span className={`text-[10px] font-black ${c.label} uppercase tracking-wider`}>
                {label} ({items.length})
              </span>
            </div>
            {items.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic font-medium">Sin adjuntos.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onUploadNewVersion={onUploadNewVersion}
                    onDelete={onDelete}
                    isMarkedForDeletion={markedForDeletion?.has(doc.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
