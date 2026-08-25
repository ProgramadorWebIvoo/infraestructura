/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timeline de iteraciones de un expediente — compone los AuditLog del
 * proyecto (ya cargados globalmente vía useProjects) en orden cronológico,
 * sin requerir ningún endpoint nuevo: cada rechazo, reenvío o nueva versión
 * de documento ya queda registrado como AuditLog al ocurrir.
 */

import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import type { AuditLog } from "../../../types";
import { getRoleColor } from "../../../utils";
import { containerVariants, itemVariants } from "../../../animations";
import { REJECTION_ACTION } from "./rejectionAudit";

interface ProjectIterationsTimelineProps {
  projectId: string;
  auditLogs: AuditLog[];
}

export default function ProjectIterationsTimeline({ projectId, auditLogs }: ProjectIterationsTimelineProps) {
  const entries = auditLogs
    .filter((log) => log.projectId === projectId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (entries.length === 0) return null;

  const rejectionCount = entries.filter((log) => log.action === REJECTION_ACTION).length;

  return (
    <div>
      {rejectionCount > 0 && (
        <div className="mb-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-danger-700 bg-danger-50 border border-danger-100 px-2.5 py-1 rounded-lg">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {rejectionCount} {rejectionCount === 1 ? "rechazo registrado" : "rechazos registrados"} en este expediente
        </div>
      )}
      <motion.ol variants={containerVariants} initial="hidden" animate="visible" className="space-y-2.5">
        {entries.map((log, i) => {
          const isRejection = log.action === REJECTION_ACTION;
          return (
            <motion.li key={log.id} variants={itemVariants} className="relative pl-5">
              {i < entries.length - 1 && (
                <span className="absolute left-[3px] top-3.5 bottom-[-10px] w-px bg-slate-200" aria-hidden="true" />
              )}
              <span className={`absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full ${isRejection ? "bg-danger-500" : "bg-slate-400"}`} aria-hidden="true" />
              <div className={`rounded-lg ${isRejection ? "bg-danger-50/50 border border-danger-100 px-2.5 py-2" : ""}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {isRejection && <AlertTriangle className="h-3.5 w-3.5 text-danger-500 shrink-0" />}
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border ${getRoleColor(log.role)}`}>
                    {log.role}
                  </span>
                  <span className={`text-xs font-bold ${isRejection ? "text-danger-800" : "text-slate-800"}`}>{log.action}</span>
                  {log.userName && (
                    <span className="text-[10px] text-slate-500 font-semibold">· {log.userName}</span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 font-semibold ml-auto whitespace-nowrap">
                    {log.timestamp}
                  </span>
                </div>
                {(log.observations || log.details) && (
                  <p className={`mt-0.5 text-[11px] font-medium whitespace-pre-line ${isRejection ? "text-danger-700" : "text-slate-500"}`}>
                    {isRejection && <strong>Motivo: </strong>}
                    {log.observations ?? log.details}
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
}
