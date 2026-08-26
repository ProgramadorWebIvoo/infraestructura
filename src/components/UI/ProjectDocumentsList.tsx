/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Listado genérico de los documentos (planos/hojas de cálculo/fotos) de un
 * proyecto — extraído del `ProjectDocuments` interno de
 * `InvestmentApprovalSection.tsx` (Procura) para reutilizarlo en la nueva
 * sección de Cierre de Obra, que además necesita badge de versión, botón de
 * previsualizar, e historial expandible (Procura solo usaba descarga).
 *
 * Se agrupa por `documentGroupId`: cada documento lógico es UNA fila (su
 * versión vigente, o si el grupo entero fue eliminado, un indicador
 * "Eliminado" con metadata de la última versión) — las versiones anteriores
 * viven colapsadas en un acordeón inline, expandible por fila. Antes cada
 * versión del histórico completo (`all_versions=true&include_deleted=true`)
 * se listaba como su propia fila suelta, mezclando V1/V2/V3 del mismo
 * documento sin jerarquía — parecía un listado plano de archivos repetidos
 * en vez de un historial.
 */

import { useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Download, Eye, FileSpreadsheet, Image as ImageIcon, Map, RefreshCw, Undo2, X } from "lucide-react";
import type { AuditLog, Project, ProjectDocument } from "../../types";
import Tooltip from "./Tooltip";
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
  /** AuditLog del proyecto — se usa para inferir el motivo de rechazo de una
   * versión antigua por proximidad temporal (no hay vínculo estructural
   * directo entre AuditLog y ProjectDocument). */
  auditLogs?: AuditLog[];
  /** "view" (default): solo lectura/exploración (Cierre de Obra). "manage":
   * habilita el botón "Nueva versión" por fila (vía onRequestNewVersion),
   * además de Eliminar (ya existente vía onDelete) — usado solo en el wizard
   * de Infraestructura, donde el usuario gestiona sus propios adjuntos. */
  mode?: "manage" | "view";
  /** Requerido en mode="manage": el usuario eligió `file` como nueva versión de `doc`. */
  onRequestNewVersion?: (doc: ProjectDocument, file: File) => void;
  /** Archivo ya elegido (pendiente de confirmar el reenvío) como nueva versión de este documento, si hay uno. */
  pendingReplacementFor?: (documentId: number) => File | undefined;
  onClearReplacement?: (documentId: number) => void;
}

const GROUPS: { type: ProjectDocument["documentType"]; label: string; icon: typeof Map; accent: SemanticColor; accept: string }[] = [
  { type: "PLANO", label: "Planos de Ingeniería", icon: Map, accent: "info", accept: ".pdf,.png,.jpg,.jpeg,.svg,.tiff,.tif,.dwg,.dxf" },
  { type: "CALC", label: "Hojas de Cálculo", icon: FileSpreadsheet, accent: "brand", accept: ".pdf,.xlsx,.xls,.csv,.ods" },
  { type: "FOTO", label: "Fotos del Sitio", icon: ImageIcon, accent: "neutral", accept: ".png,.jpg,.jpeg,.webp" },
  { type: "CORRECCION", label: "Correcciones de Cierre de Obra", icon: AlertTriangle, accent: "danger", accept: "" },
];

/** Busca en auditLogs el rechazo más cercano en el tiempo a una versión dada
 * — no hay vínculo estructural entre AuditLog y ProjectDocument, así que el
 * cruce es por proximidad temporal (suficiente para auditoría visual, no
 * para lógica de negocio). Solo considera rechazos ANTERIORES a la versión
 * (el motivo de un rechazo precede a la corrección que lo resuelve). */
function findRejectionReason(version: ProjectDocument, latestVersionNumber: number, auditLogs: AuditLog[], projectId: string): string | null {
  if (version.versionNumber >= latestVersionNumber) return null;
  const versionTime = version.uploadedAt ? new Date(version.uploadedAt).getTime() : NaN;
  if (Number.isNaN(versionTime)) return null;

  const rejections = auditLogs
    .filter((l) => l.projectId === projectId && l.action === "Rechazo de petición de obra")
    .filter((l) => new Date(l.timestamp).getTime() <= versionTime)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const closest = rejections[0];
  return closest ? (closest.observations ?? closest.details ?? null) : null;
}

/** Una fila del acordeón (versión anterior, dentro del historial expandido). */
function HistoryVersionRow({
  version,
  reason,
  onPreview,
  onDownload,
}: {
  version: ProjectDocument;
  reason: string | null;
  onPreview: (doc: ProjectDocument) => void;
  onDownload: (doc: ProjectDocument) => void;
}) {
  const isDeleted = !!version.deletedAt;
  return (
    <li className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${isDeleted ? "bg-danger-50/50" : "bg-slate-50"}`}>
      <div className="min-w-0 flex items-center gap-1.5">
        <span className="shrink-0 text-[9px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
          V{version.versionNumber}
        </span>
        <span className={`text-[11px] font-semibold truncate ${isDeleted ? "text-slate-400 line-through" : "text-slate-600"}`} title={version.originalName}>
          {version.uploadedAt ? new Date(version.uploadedAt).toLocaleString() : version.originalName}
        </span>
        {isDeleted && (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-danger-600 bg-danger-50 border border-danger-200 px-1.5 py-0.5 rounded">
            Eliminado
          </span>
        )}
        {reason && <span className="block text-[10px] text-danger-500 font-medium truncate">· {reason}</span>}
      </div>
      {!isDeleted && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip content="Ver">
            <button type="button" onClick={() => onPreview(version)} aria-label={`Ver V${version.versionNumber}`} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Descargar">
            <button type="button" onClick={() => onDownload(version)} aria-label={`Descargar V${version.versionNumber}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
              <Download className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      )}
    </li>
  );
}

/** Fila principal de un documento lógico (grupo) — su estado actual (vigente
 * o eliminado), con acordeón opcional para las versiones anteriores. */
function DocumentGroupRow({
  current,
  olderVersions,
  isGroupDeleted,
  projectId,
  auditLogs,
  onDownload,
  onPreview,
  onDelete,
  isMarkedForDeletion,
  mode = "view",
  accept,
  onRequestNewVersion,
  pendingReplacement,
  onClearReplacement,
}: {
  /** La fila que representa el estado del grupo: la versión vigente si sigue vivo, o la última versión si el grupo fue eliminado. */
  current: ProjectDocument;
  olderVersions: ProjectDocument[];
  isGroupDeleted: boolean;
  projectId: string;
  auditLogs?: AuditLog[];
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  onDelete?: (doc: ProjectDocument) => void;
  isMarkedForDeletion?: boolean;
  mode?: "manage" | "view";
  accept?: string;
  onRequestNewVersion?: (doc: ProjectDocument, file: File) => void;
  pendingReplacement?: File;
  onClearReplacement?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const newVersionInputRef = useRef<HTMLInputElement>(null);
  const canRequestNewVersion = mode === "manage" && !isGroupDeleted && !isMarkedForDeletion && !!onRequestNewVersion;
  const hasHistory = olderVersions.length > 0;

  return (
    <li className={`border rounded-xl overflow-hidden ${isMarkedForDeletion || isGroupDeleted ? "bg-danger-50/60 border-danger-100" : "bg-white border-slate-100"}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex items-center gap-1.5">
          {hasHistory && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label="Ver versiones anteriores"
              aria-expanded={expanded}
              className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
          <span className={`text-xs font-bold truncate ${isMarkedForDeletion || isGroupDeleted ? "text-slate-400 line-through" : "text-slate-800"}`} title={current.originalName}>
            {current.originalName}
          </span>
          {current.versionNumber > 1 && (
            <span className="shrink-0 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              V{current.versionNumber}
            </span>
          )}
          {!isGroupDeleted && (
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-success-700 bg-success-50 border border-success-200 px-1.5 py-0.5 rounded">
              Actual
            </span>
          )}
          {isGroupDeleted && (
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-danger-600 bg-danger-50 border border-danger-200 px-1.5 py-0.5 rounded">
              Eliminado
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isGroupDeleted ? (
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap px-1.5" title={current.deletedAt ?? undefined}>
              {new Date(current.deletedAt!).toLocaleDateString()}
            </span>
          ) : isMarkedForDeletion ? (
            onDelete && (
              <button type="button" onClick={() => onDelete(current)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors cursor-pointer whitespace-nowrap">
                <Undo2 className="h-4 w-4" />
                Deshacer
              </button>
            )
          ) : (
            <>
              <Tooltip content="Ver">
                <button type="button" onClick={() => onPreview(current)} aria-label="Ver" className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer">
                  <Eye className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Descargar">
                <button type="button" onClick={() => onDownload(current)} aria-label="Descargar" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Download className="h-4 w-4" />
                </button>
              </Tooltip>
              {canRequestNewVersion && (
                <Tooltip content="Subir nueva versión">
                  <button
                    type="button"
                    onClick={() => newVersionInputRef.current?.click()}
                    aria-label="Subir nueva versión"
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip content="Eliminar">
                  <button type="button" onClick={() => onDelete(current)} aria-label="Eliminar" className="p-2 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      {canRequestNewVersion && (
        <input
          ref={newVersionInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onRequestNewVersion!(current, file);
            e.target.value = "";
          }}
        />
      )}
      {canRequestNewVersion && pendingReplacement && (
        <div className="mx-3 mb-2.5 flex items-center justify-between gap-2 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1.5">
          <span className="min-w-0 flex items-center gap-1.5 text-[10px] font-bold text-brand-700 truncate">
            <RefreshCw className="h-3 w-3 shrink-0" />
            Nueva versión lista: {pendingReplacement.name}
          </span>
          <button
            type="button"
            onClick={onClearReplacement}
            className="shrink-0 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Quitar
          </button>
        </div>
      )}

      {hasHistory && expanded && (
        <ul className="px-3 pb-2.5 space-y-1 border-t border-slate-100 pt-2">
          {olderVersions
            .slice()
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((v) => (
              <HistoryVersionRow
                key={v.id}
                version={v}
                reason={findRejectionReason(v, current.versionNumber, auditLogs ?? [], projectId)}
                onPreview={onPreview}
                onDownload={onDownload}
              />
            ))}
        </ul>
      )}
    </li>
  );
}

export default function ProjectDocumentsList({
  project,
  onDownload,
  onPreview,
  onDelete,
  markedForDeletion,
  auditLogs,
  mode = "view",
  onRequestNewVersion,
  pendingReplacementFor,
  onClearReplacement,
}: ProjectDocumentsListProps) {
  const docs = project.documents ?? [];
  if (docs.length === 0) return null;

  // Agrupa por document_group_id: cada documento lógico es UNA fila (la
  // vigente, o si el grupo entero fue eliminado, la más reciente marcada
  // "Eliminado") con las versiones anteriores colapsadas en un acordeón —
  // en vez de listar cada versión del histórico como su propia fila suelta.
  const byGroup: Record<number, ProjectDocument[]> = {};
  for (const d of docs) {
    (byGroup[d.documentGroupId] ??= []).push(d);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {GROUPS.map(({ type, label, icon: Icon, accent, accept }) => {
        const groupsOfType = Object.entries(byGroup)
          .filter(([, versions]) => versions[0].documentType === type)
          .map(([groupIdKey, versions]) => {
            const groupId = Number(groupIdKey);
            const sorted = versions.slice().sort((a, b) => a.versionNumber - b.versionNumber);
            const isGroupDeleted = sorted.every((v) => v.deletedAt);
            const current = sorted[sorted.length - 1];
            const olderVersions = sorted.slice(0, -1);
            return { groupId, current, olderVersions, isGroupDeleted };
          })
          .sort((a, b) => a.groupId - b.groupId);

        const c = SEMANTIC_COLOR_MAP[accent];
        return (
          <div key={type} className={`rounded-xl border ${c.border100} ${c.bg50} p-3 space-y-2`}>
            <div className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${c.icon400} shrink-0`} />
              <span className={`text-[10px] font-black ${c.text700} uppercase tracking-wider`}>
                {label} ({groupsOfType.length})
              </span>
            </div>
            {groupsOfType.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic font-medium">Sin adjuntos.</p>
            ) : (
              <ul className="space-y-1">
                {groupsOfType.map(({ groupId, current, olderVersions, isGroupDeleted }) => (
                  <DocumentGroupRow
                    key={groupId}
                    current={current}
                    olderVersions={olderVersions}
                    isGroupDeleted={isGroupDeleted}
                    projectId={project.id}
                    mode={mode}
                    accept={accept}
                    onRequestNewVersion={onRequestNewVersion}
                    pendingReplacement={pendingReplacementFor?.(current.id)}
                    onClearReplacement={onClearReplacement ? () => onClearReplacement(current.id) : undefined}
                    auditLogs={auditLogs}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onDelete={onDelete}
                    isMarkedForDeletion={markedForDeletion?.has(current.id)}
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
