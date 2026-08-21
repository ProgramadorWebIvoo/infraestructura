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

import { useState } from "react";
import { AlertTriangle, Download, Eye, FileSpreadsheet, History, Image as ImageIcon, Map } from "lucide-react";
import { apiFetch } from "../../services/api";
import type { Project, ProjectDocument } from "../../types";

interface ProjectDocumentsListProps {
  project: Project;
  authToken: string;
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  /** Solo se pasa desde Cierre de Obra — Procura no sube nuevas versiones. */
  onUploadNewVersion?: (doc: ProjectDocument) => void;
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
  projectId,
  onDownload,
  onPreview,
  onUploadNewVersion,
}: {
  doc: ProjectDocument;
  projectId: string;
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  onUploadNewVersion?: (doc: ProjectDocument) => void;
}) {
  const [history, setHistory] = useState<ProjectDocument[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const toggleHistory = async () => {
    if (history !== null) {
      setHistory(null);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const res = await apiFetch<{ data: ProjectDocument[] }>(
        `/projects/${projectId}/documents/${doc.id}/history`,
      );
      setHistory(res.data);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <li className="bg-white border border-slate-100 rounded-lg px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-800 truncate" title={doc.originalName}>
            {doc.originalName}
          </span>
          {doc.versionNumber > 1 && (
            <span className="shrink-0 text-[9px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              V{doc.versionNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => onPreview(doc)} className="text-slate-400 hover:text-sky-600 transition-colors cursor-pointer" title="Ver">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDownload(doc)} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" title="Descargar">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={toggleHistory} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" title="Historial">
            <History className="h-3.5 w-3.5" />
          </button>
          {onUploadNewVersion && (
            <button
              type="button"
              onClick={() => onUploadNewVersion(doc)}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              Nueva versión
            </button>
          )}
        </div>
      </div>

      {isLoadingHistory && <p className="text-[10px] text-slate-400 mt-1 italic">Cargando historial...</p>}

      {history && (
        <ul className="mt-1.5 pl-2 border-l-2 border-slate-100 space-y-1">
          {history.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="font-mono font-bold text-slate-500">
                V{v.versionNumber} · {v.originalName}
              </span>
              <button type="button" onClick={() => onDownload(v)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <Download className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ProjectDocumentsList({ project, authToken: _authToken, onDownload, onPreview, onUploadNewVersion }: ProjectDocumentsListProps) {
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
                    projectId={project.id}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onUploadNewVersion={onUploadNewVersion}
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
