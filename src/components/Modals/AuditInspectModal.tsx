/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de log de auditoría — vista tipo "traza forense":
 * timestamp → usuario (rol) → acción → proyecto, con detalles/observaciones
 * en un visor estructurado (clave-valor si `details`/`observations` son JSON
 * parseable, texto plano si no) y utilidades de copiado rápido (ID, usuario,
 * payload completo) para pegar en un reporte o ticket sin transcribir a mano.
 */

import { useState } from "react";
import { Activity, ArrowRight, Building2, Check, Clipboard, Clock, FileText, Hash, User } from "lucide-react";
import type { AuditLog } from "@/types";
import Modal from "@/components/UI/Modal";
import { getRoleColor } from "@/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { useToast } from "@/components/UI/Toast";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuditInspectModalProps {
  isOpen: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Intenta parsear un campo de texto como JSON para renderizarlo como grilla clave-valor; si no es JSON válido, se muestra como texto plano tal cual. */
function tryParseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      showToast("No se pudo copiar al portapapeles.", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copiar ${label}`}
      aria-label={`Copiar ${label}`}
      className="inline-flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Visor de un campo de texto libre: grilla clave-valor si es JSON, texto plano si no, placeholder discreto si está vacío. */
function DetailViewer({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <p className="text-xs text-slate-300 italic">Sin datos adicionales.</p>;
  }
  const parsed = tryParseJsonObject(value);
  if (parsed && !Array.isArray(parsed)) {
    const entries = Object.entries(parsed);
    if (entries.length === 0) {
      return <p className="text-xs text-slate-300 italic">Objeto vacío.</p>;
    }
    return (
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start justify-between gap-4 px-3 py-2 bg-white even:bg-slate-50/60">
            <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">{key}</span>
            <span className="text-xs font-mono text-slate-800 text-right break-all">{formatJsonValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{value}</p>;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function AuditInspectModal({ isOpen, log, onClose }: AuditInspectModalProps) {
  const fullPayload = log
    ? JSON.stringify(
        {
          id: log.id,
          timestamp: log.timestamp,
          role: log.role,
          userName: log.userName,
          projectId: log.projectId,
          projectTitle: log.projectTitle,
          action: log.action,
          details: log.details,
          observations: log.observations,
        },
        null,
        2,
      )
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      badge="Auditoría • Log de Control"
      title={log?.action ?? ""}
      infoLine={log ? `${log.timestamp} • ${log.role}` : undefined}
      maxWidth="max-w-lg"
      icon={<Activity className="h-5 w-5" />}
      iconColor="sky"
      footer={
        <div className="flex items-center justify-between">
          {log && (
            <button
              type="button"
              onClick={async () => {
                await copyToClipboard(fullPayload);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <Clipboard className="h-3.5 w-3.5" />
              Copiar JSON completo
            </button>
          )}
          <button
            id="btn-close-audit-inspect"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {!log ? (
        <p className="text-sm text-slate-400 italic text-center py-8">Registro no disponible.</p>
      ) : (
        <div className="space-y-5">

          {/* ── Traza — timestamp → usuario (rol) → acción → proyecto ── */}
          <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {log.timestamp}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {log.userName ?? <span className="text-slate-300 italic font-mono">Sin usuario</span>}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${getRoleColor(log.role)}`}>{log.role}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="font-bold text-slate-900">{log.action}</span>
              {log.projectTitle && (
                <>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <span className="inline-flex items-center gap-1.5 font-bold text-sky-700">
                    <Building2 className="h-3.5 w-3.5" />
                    {log.projectTitle}
                  </span>
                </>
              )}
            </div>
          </section>

          {/* ── Proyecto ── */}
          {log.projectId && (
            <section>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Proyecto
              </h4>
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium">ID</span>
                  <span className="flex items-center gap-1">
                    <span className="text-xs font-mono font-bold text-sky-600">{log.projectId}</span>
                    <CopyButton value={log.projectId} label="ID de proyecto" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500 font-medium">Título</span>
                  <span className="text-xs font-bold text-slate-800 text-right max-w-[260px]">{log.projectTitle}</span>
                </div>
              </div>
            </section>
          )}

          {/* ── Detalles ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Detalles
            </h4>
            <DetailViewer value={log.details} />
          </section>

          {/* ── Observaciones ── */}
          {log.observations && (
            <section>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Observaciones
              </h4>
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{log.observations}</p>
              </div>
            </section>
          )}

          {/* ── Metadatos ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              Metadatos
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-medium">ID del registro</span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{log.id}</span>
                  <CopyButton value={log.id} label="ID del registro" />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Timestamp
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">{log.timestamp}</span>
              </div>
            </div>
          </section>

        </div>
      )}
    </Modal>
  );
}
