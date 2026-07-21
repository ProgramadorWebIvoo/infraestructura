/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de inspección de log de auditoría — muestra todos los campos
 * del registro seleccionado en formato legible y sin truncamientos.
 */

import { Activity, User, Building2, FileText, Clock, Hash } from "lucide-react";
import type { AuditLog } from "../../types";
import Modal from "../UI/Modal";
import { getRoleColor } from "../../utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuditInspectModalProps {
  isOpen: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function AuditInspectModal({ isOpen, log, onClose }: AuditInspectModalProps) {
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
        <div className="flex justify-end">
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

          {/* ── Proyecto ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Proyecto
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">ID</span>
                <span className="text-xs font-mono font-bold text-sky-600">{log.projectId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Título</span>
                <span className="text-xs font-bold text-slate-800 text-right max-w-[260px]">{log.projectTitle}</span>
              </div>
            </div>
          </section>

          {/* ── Acción ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Acción ejecutada
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Rol</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${getRoleColor(log.role)}`}>{log.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Usuario
                </span>
                <span className="text-xs font-bold text-slate-700">{log.userName ?? <span className="text-slate-300 italic font-mono">—</span>}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-slate-500 font-medium shrink-0">Descripción</span>
                <span className="text-xs font-semibold text-slate-800 text-right">{log.action}</span>
              </div>
            </div>
          </section>

          {/* ── Detalles completos ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Detalles
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {log.details ?? <span className="text-slate-300 italic">Sin detalles adicionales.</span>}
              </p>
            </div>
          </section>

          {/* ── Metadatos ── */}
          <section>
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              Metadatos
            </h4>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">ID del registro</span>
                <span className="text-[10px] font-mono font-bold text-slate-400">{log.id}</span>
              </div>
              <div className="flex items-center justify-between">
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
