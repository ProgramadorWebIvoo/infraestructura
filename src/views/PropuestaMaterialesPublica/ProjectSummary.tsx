/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Identidad del proveedor invitado + resumen del proyecto — extraída de
 * PropuestaMaterialesPublica.
 */

import { Mail, MapPin, Package } from "lucide-react";
import type { InvitationPublicInfo } from "./types";

interface ProjectSummaryProps {
  invitation: InvitationPublicInfo;
}

export default function ProjectSummary({ invitation }: ProjectSummaryProps) {
  const { project } = invitation;

  return (
    <>
      {/* Supplier identity */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 flex flex-wrap items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Este enlace fue generado para</div>
          <div className="font-black text-white text-sm">{invitation.supplierName}</div>
          {invitation.supplierCompany && (
            <div className="text-xs text-indigo-300 font-semibold">{invitation.supplierCompany}</div>
          )}
          <div className="text-[11px] text-indigo-300/70 font-mono mt-0.5">{invitation.supplierContact}</div>
        </div>
      </div>

      {/* Project info */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                {project.id}
              </span>
              <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                {project.type}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">{project.title}</h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {project.location}
            </div>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">{project.description}</p>
          </div>
        </div>
      </div>
    </>
  );
}
