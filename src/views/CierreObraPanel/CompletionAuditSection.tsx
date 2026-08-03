/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Cierre de Obra: auditoría de fin de obra — extraída de
 * CierreObraPanel.
 */

import { useMemo, useState } from "react";
import { BadgeCheck, Banknote, CalendarDays, HardHat, HelpCircle, MapPin } from "lucide-react";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import Button from "../../components/UI/Button";
import EmptyState from "../../components/UI/EmptyState";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import StatusBadge from "../../components/UI/StatusBadge";
import { formatCurrency } from "../../utils";

interface CompletionAuditSectionProps {
  projects: Project[];
  onVerifyCompletion: (projectId: string) => void;
}

function ProjectTypeBadge({ type }: { type: Project["type"] }) {
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${
      type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
    }`}>
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

export default function CompletionAuditSection({ projects, onVerifyCompletion }: CompletionAuditSectionProps) {
  const [confirmVerifyProject, setConfirmVerifyProject] = useState<Project | null>(null);

  const pendingCompletionVerify = useMemo(
    () => projects.filter(
      p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
    ),
    [projects],
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
          actions={
            pendingCompletionVerify.length > 0 ? (
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                {pendingCompletionVerify.length} en seguimiento
              </span>
            ) : undefined
          }
        />

        {pendingCompletionVerify.length === 0 ? (
          <EmptyState message="No hay obras en ejecución o pendientes de entrega técnica en este momento." />
        ) : (
          <div
            className="space-y-4 max-h-80 overflow-y-auto pr-1 pb-2 scroll-smooth scroll-pb-2"
          >
            {pendingCompletionVerify.map((p) => {
              const isUnderAudit = p.status === ProjectStatus.VERIFICANDO_FINALIZACION;
              return (
                <div
                  key={p.id}
                  className="p-4 border border-slate-100 bg-white rounded-xl space-y-3 hover:border-emerald-200 hover:shadow-sm transition-all duration-200"
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                >
                  {/* Header: ID + tipo + badge de estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                        <ProjectTypeBadge type={p.type} />
                      </div>
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

                  {/* Mini stepper de auditoría */}
                  <div className="flex items-center gap-2" aria-hidden="true">
                    <div className={`flex-1 h-1.5 rounded-full ${isUnderAudit ? "bg-emerald-400" : "bg-slate-200"}`} />
                    <div className={`flex-1 h-1.5 rounded-full ${isUnderAudit ? "bg-emerald-500" : "bg-slate-100"}`} />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                    <span className={isUnderAudit ? "text-emerald-600" : "text-slate-400"}>Reportada finalizada</span>
                    <span className={isUnderAudit ? "text-emerald-700" : "text-slate-300"}>Certificar calidad</span>
                  </div>

                  {/* Datos de la obra */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                        <HardHat className="h-3 w-3" /> Contratista
                      </div>
                      <span className="font-mono text-emerald-700 font-bold">
                        {p.selectedContractorCode || "Sin código"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                        <Banknote className="h-3 w-3" /> Total (Est)
                      </div>
                      <span className="font-mono font-bold text-slate-700">{formatCurrency(p.estimatedTotal)}</span>
                    </div>
                  </div>

                  {p.advancePaidAmount != null && p.advancePaidAmount > 0 && (
                    <div className="bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2 text-[10px] text-slate-600 font-medium flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      Anticipo liberado: <strong className="font-mono text-amber-700">{formatCurrency(p.advancePaidAmount)}</strong>
                      {p.advancePaidDate && (
                        <span className="ml-auto inline-flex items-center gap-1 text-slate-400 font-mono">
                          <CalendarDays className="h-3 w-3" /> {p.advancePaidDate}
                        </span>
                      )}
                    </div>
                  )}

                  {p.cierreObraNotes && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500 leading-snug">
                      <span className="font-bold text-slate-500">Revisión Inicial:</span> {p.cierreObraNotes}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-medium leading-snug flex items-start gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-px" />
                    {isUnderAudit
                      ? "La obra ya fue reportada como finalizada. Confirme la certificación de calidad para autorizar el pago."
                      : "Al confirmar, solo se reporta la obra como finalizada. Luego deberá certificar la calidad en un segundo paso."}
                  </p>

                  <Button
                    id={`btn-verify-quality-${p.id}`}
                    onClick={() => setConfirmVerifyProject(p)}
                    variant="primary"
                    colorScheme="emerald"
                    size="md"
                    className="w-full"
                    icon={<BadgeCheck className="h-4 w-4" />}
                  >
                    {isUnderAudit ? "Certificar Calidad y Autorizar Pago" : "Reportar Obra como Finalizada"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
