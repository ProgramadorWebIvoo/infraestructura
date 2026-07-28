/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Cierre de Obra: auditoría de fin de obra — extraída de
 * CierreObraPanel.
 */

import { useState } from "react";
import { BadgeCheck, HelpCircle, MapPin } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import EmptyState from "../../components/UI/EmptyState";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import StatusBadge from "../../components/UI/StatusBadge";

interface CompletionAuditSectionProps {
  projects: Project[];
  onVerifyCompletion: (projectId: string) => void;
}

export default function CompletionAuditSection({ projects, onVerifyCompletion }: CompletionAuditSectionProps) {
  const [confirmVerifyProject, setConfirmVerifyProject] = useState<Project | null>(null);

  const pendingCompletionVerify = projects.filter(
    p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
  );

  const confirmIsUnderAudit = confirmVerifyProject?.status === ProjectStatus.VERIFICANDO_FINALIZACION;

  return (
    <>
      <Card className="border-l-4 border-l-emerald-400">
        <SectionHeader
          icon={<BadgeCheck className="h-5 w-5" />}
          title="Auditoría de Fin de Obra"
          description="Certifique la calidad de la entrega técnica y libere el finiquito de obra."
          color="emerald"
        />

        {pendingCompletionVerify.length === 0 ? (
          <EmptyState message="No hay obras en ejecución o pendientes de entrega técnica en este momento." />
        ) : (
          <div
            className="space-y-4 max-h-80 overflow-y-auto pr-1"
            style={{ willChange: "scroll-position" }}
          >
            {pendingCompletionVerify.map((p) => {
              const isUnderAudit = p.status === ProjectStatus.VERIFICANDO_FINALIZACION;
              return (
                <div
                  key={p.id}
                  className="p-4 border border-slate-100 bg-white rounded-xl space-y-3 hover:border-emerald-200 hover:shadow-sm transition-all duration-200"
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">{p.title}</h4>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {p.location}
                      </div>
                    </div>
                    <StatusBadge
                      code={isUnderAudit ? "VERIFICANDO_FINALIZACION" : "EN_EJECUCION"}
                      label={isUnderAudit ? "Paso 2 de 2 · Auditoría" : "Paso 1 de 2 · En Curso"}
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Contratista:</span>
                      <span className="font-mono text-emerald-700 font-bold">{p.selectedContractorCode || "Sin código"}</span>
                    </div>
                    {p.cierreObraNotes && (
                      <p className="mt-2 text-slate-500 border-t border-slate-200/60 pt-2 leading-snug">
                        <span className="font-bold text-slate-500">Revisión Inicial:</span> {p.cierreObraNotes}
                      </p>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium leading-snug">
                    {isUnderAudit
                      ? "La obra ya fue reportada como finalizada. Confirme la certificación de calidad para autorizar el pago."
                      : "Al confirmar, solo se reporta la obra como finalizada. Luego deberá certificar la calidad en un segundo paso."}
                  </p>

                  <button
                    id={`btn-verify-quality-${p.id}`}
                    onClick={() => setConfirmVerifyProject(p)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    {isUnderAudit ? "Certificar Calidad y Autorizar Pago" : "Reportar Obra como Finalizada"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Detailed returns documentation info box */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 text-xs space-y-3 text-slate-600 leading-relaxed shadow-sm border-l-4 border-l-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 rounded-xl">
            <HelpCircle className="h-4 w-4 text-sky-500" />
          </div>
          <h5 className="font-bold text-slate-800 text-sm">
            Flujo de Retornos
          </h5>
        </div>
        <p className="font-medium text-slate-500">
          De acuerdo con los procedimientos operativos de IVOO:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-sky-50 text-sky-600 font-mono text-[9px] font-black shrink-0 mt-0.5">1</span>
            <span className="text-slate-500 font-medium leading-relaxed">Cierre de Obra realiza la cubicación de materiales y planos de ingeniería iniciales.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-sky-50 text-sky-600 font-mono text-[9px] font-black shrink-0 mt-0.5">2</span>
            <span className="text-slate-500 font-medium leading-relaxed">Al finalizar el trabajo, audita físicamente la obra y certifica si cumple con los estándares estipulados.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-50 text-amber-600 font-mono text-[9px] font-black shrink-0 mt-0.5">3</span>
            <span className="text-slate-500 font-medium leading-relaxed">Su aprobación final viaja a la Base de Datos para que <strong className="text-slate-700">Finanzas</strong> proceda con la liberación del finiquito.</span>
          </div>
        </div>
      </div>

      {/* ── Confirm Verify Completion ── */}
      <ConfirmDialog
        isOpen={!!confirmVerifyProject}
        onClose={() => setConfirmVerifyProject(null)}
        onConfirm={() => {
          if (confirmVerifyProject) {
            onVerifyCompletion(confirmVerifyProject.id);
            setConfirmVerifyProject(null);
          }
        }}
        title={confirmIsUnderAudit ? "Paso 2 de 2 · Certificar Calidad" : "Paso 1 de 2 · Reportar Finalización"}
        message={
          confirmIsUnderAudit
            ? "¿Estás seguro de certificar la calidad de esta obra? Esta acción autorizará el pago final al contratista. Una vez certificada, no podrá revertirse."
            : "¿Estás seguro de reportar esta obra como finalizada? Esto la enviará a auditoría de calidad; el pago final se autorizará en un segundo paso, una vez certificada la calidad."
        }
        variant="warning"
        confirmLabel={confirmIsUnderAudit ? "Certificar y autorizar pago" : "Reportar como finalizada"}
      />
    </>
  );
}
