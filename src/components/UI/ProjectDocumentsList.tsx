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

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Eye, FileSpreadsheet, History, Image as ImageIcon, Map, Undo2, X } from "lucide-react";
import type { AuditLog, Project, ProjectDocument } from "../../types";
import { fetchDocumentHistory } from "../../services/api";
import Tooltip from "./Tooltip";
import Spinner from "./Spinner";
import VersionHistoryPopover from "./VersionHistoryPopover";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";

interface ProjectDocumentsListProps {
  project: Project;
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  /** Marca/desmarca un documento para eliminar — el consumidor decide si es
   * inmediato o reversible (ver useRequestForm::markDocumentForDeletion, que
   * lo aplica recién al confirmar el reenvío). Cuando se provee, cada fila
   * muestra un botón de eliminar/deshacer en vez de nada. */
  onDelete?: (doc: ProjectDocument) => void;
  /** IDs marcados para eliminar — esas filas se muestran tachadas con opción de deshacer. */
  markedForDeletion?: Set<number>;
  /** Habilita el acordeón "Ver historial" por documento (V1, V2, ...) — solo
   * tiene sentido en vistas de auditoría (Cierre de Obra), no en el paso de
   * adjuntos de Infraestructura. Requiere authToken para llamar history(). */
  authToken?: string;
  /** AuditLog del proyecto — se usa para inferir el motivo de rechazo de una
   * versión antigua por proximidad temporal (no hay vínculo estructural
   * directo entre AuditLog y ProjectDocument). */
  auditLogs?: AuditLog[];
}

const GROUPS: { type: ProjectDocument["documentType"]; label: string; icon: typeof Map; accent: SemanticColor }[] = [
  { type: "PLANO", label: "Planos de Ingeniería", icon: Map, accent: "info" },
  { type: "CALC", label: "Hojas de Cálculo", icon: FileSpreadsheet, accent: "brand" },
  { type: "FOTO", label: "Fotos del Sitio", icon: ImageIcon, accent: "neutral" },
  { type: "CORRECCION", label: "Correcciones de Cierre de Obra", icon: AlertTriangle, accent: "danger" },
];

/** Busca en auditLogs el rechazo más cercano en el tiempo a una versión dada
 * — no hay vínculo estructural entre AuditLog y ProjectDocument, así que el
 * cruce es por proximidad temporal (suficiente para auditoría visual, no
 * para lógica de negocio). Solo considera rechazos ANTERIORES a la versión
 * (el motivo de un rechazo precede a la corrección que lo resuelve). */
function findRejectionReason(version: ProjectDocument, auditLogs: AuditLog[], projectId: string): string | null {
  const versionTime = version.uploadedAt ? new Date(version.uploadedAt).getTime() : NaN;
  if (Number.isNaN(versionTime)) return null;

  const rejections = auditLogs
    .filter((l) => l.projectId === projectId && l.action === "Rechazo de petición de obra")
    .filter((l) => new Date(l.timestamp).getTime() <= versionTime)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const closest = rejections[0];
  return closest ? (closest.observations ?? closest.details ?? null) : null;
}

function DocumentHistoryPopoverContent({
  doc,
  projectId,
  authToken,
  auditLogs,
  onPreview,
}: {
  doc: ProjectDocument;
  projectId: string;
  authToken: string;
  auditLogs: AuditLog[];
  onPreview: (doc: ProjectDocument) => void;
}) {
  const [versions, setVersions] = useState<ProjectDocument[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDocumentHistory(projectId, doc.id, authToken)
      .then((data) => { if (!cancelled) setVersions(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  return (
    <div className="p-2.5 space-y-1">
      <span className="block px-1.5 pb-1.5 mb-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700/60">
        Historial de versiones
      </span>
      {isLoading && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold py-1 px-1.5">
          <Spinner size="xs" /> Cargando…
        </div>
      )}
      {error && <p className="text-[10px] text-danger-400 font-semibold py-1 px-1.5">No se pudo cargar el historial.</p>}
      {versions?.slice().reverse().map((v) => {
        const reason = v.versionNumber < doc.versionNumber ? findRejectionReason(v, auditLogs, projectId) : null;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onPreview(v)}
            className="w-full flex items-start gap-2 text-left px-1.5 py-1.5 rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <span className="shrink-0 text-[10px] font-mono font-bold text-slate-200 bg-slate-700/80 border border-slate-600 px-1.5 py-0.5 rounded mt-0.5">
              V{v.versionNumber}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-slate-100 truncate">
                {v.uploadedAt ? new Date(v.uploadedAt).toLocaleString() : v.originalName}
              </span>
              {reason && <span className="block text-[10px] text-danger-400 font-medium">Observación: {reason}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DocumentRow({
  doc,
  projectId,
  authToken,
  auditLogs,
  onDownload,
  onPreview,
  onDelete,
  isMarkedForDeletion,
}: {
  doc: ProjectDocument;
  projectId?: string;
  authToken?: string;
  auditLogs?: AuditLog[];
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  onDelete?: (doc: ProjectDocument) => void;
  isMarkedForDeletion?: boolean;
}) {
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const canShowHistory = doc.versionNumber > 1 && !!projectId && !!authToken;

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
              {canShowHistory && (
                <Tooltip content="Ver historial" disabled={showHistory}>
                  <button
                    ref={historyButtonRef}
                    type="button"
                    onClick={() => setShowHistory((prev) => !prev)}
                    aria-label="Ver historial"
                    aria-expanded={showHistory}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${showHistory ? "text-sky-600 bg-sky-50" : "text-slate-400 hover:text-sky-600 hover:bg-sky-50"}`}
                  >
                    <History className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
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
      {canShowHistory && (
        <VersionHistoryPopover isOpen={showHistory} onClose={() => setShowHistory(false)} anchorRef={historyButtonRef}>
          <DocumentHistoryPopoverContent
            doc={doc}
            projectId={projectId!}
            authToken={authToken!}
            auditLogs={auditLogs ?? []}
            onPreview={onPreview}
          />
        </VersionHistoryPopover>
      )}
    </li>
  );
}

export default function ProjectDocumentsList({ project, onDownload, onPreview, onDelete, markedForDeletion, authToken, auditLogs }: ProjectDocumentsListProps) {
  const docs = project.documents ?? [];
  if (docs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {GROUPS.map(({ type, label, icon: Icon, accent }) => {
        const items = docs.filter((d) => d.documentType === type);
        const c = SEMANTIC_COLOR_MAP[accent];
        return (
          <div key={type} className={`rounded-xl border ${c.border100} ${c.bg50} p-3 space-y-2`}>
            <div className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${c.icon400} shrink-0`} />
              <span className={`text-[10px] font-black ${c.text700} uppercase tracking-wider`}>
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
                    authToken={authToken}
                    auditLogs={auditLogs}
                    onDownload={onDownload}
                    onPreview={onPreview}
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
