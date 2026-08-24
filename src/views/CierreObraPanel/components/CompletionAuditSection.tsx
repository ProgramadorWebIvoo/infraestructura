/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Cierre de Obra: auditoría de fin de obra — extraída de
 * CierreObraPanel.
 */

import { useMemo, useState } from "react";
import { BadgeCheck, Banknote, CalendarDays, HardHat, HelpCircle, MapPin } from "lucide-react";
import { ProjectStatus } from "../../../types";
import type { Project } from "../../../types";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Button from "../../../components/UI/Button";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import ConfirmDialog from "../../../components/UI/ConfirmDialog";
import StatusBadge from "../../../components/UI/StatusBadge";
import { Table, type Column } from "../../../components/UI/Table";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { formatCurrency } from "../../../utils";
import { useContainerRows } from "../../../hooks/useContainerRows";

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

const success = SEMANTIC_COLOR_MAP.success;
const warning = SEMANTIC_COLOR_MAP.warning;

export default function CompletionAuditSection({ projects, onVerifyCompletion }: CompletionAuditSectionProps) {
  const { containerRef } = useContainerRows({ paginated: false });
  const [detailProjectId, setDetailProjectId] = useState("");
  const [confirmVerifyProject, setConfirmVerifyProject] = useState<Project | null>(null);

  const pendingCompletionVerify = useMemo(
    () => projects.filter(
      p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
    ),
    [projects],
  );

  const detailProject = pendingCompletionVerify.find((p) => p.id === detailProjectId) ?? null;
  const detailIsUnderAudit = detailProject?.status === ProjectStatus.VERIFICANDO_FINALIZACION;
  const confirmIsUnderAudit = confirmVerifyProject?.status === ProjectStatus.VERIFICANDO_FINALIZACION;

  const closeDetail = () => setDetailProjectId("");

  const columns: Column<Project>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className={`font-mono font-bold text-[10px] ${success.text600} whitespace-nowrap`}>{p.id}</span>,
    },
    {
      key: "title",
      label: "Título / Ubicación",
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{p.title}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {p.location}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      width: "5.5rem",
      sortable: true,
      render: (p) => <ProjectTypeBadge type={p.type} />,
    },
    {
      key: "status",
      label: "Estado",
      width: "9rem",
      sortable: true,
      render: (p) => (
        <StatusBadge
          code={p.status === ProjectStatus.VERIFICANDO_FINALIZACION ? "VERIFICANDO_FINALIZACION" : "EN_EJECUCION"}
          label={p.status === ProjectStatus.VERIFICANDO_FINALIZACION ? "Paso 2 de 2 · Auditoría" : "Paso 1 de 2 · En Curso"}
        />
      ),
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "7.5rem",
      align: "right",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-slate-800 whitespace-nowrap">{formatCurrency(p.estimatedTotal)}</span>,
    },
  ];

  return (
    <>
      <Card accent="success" className="min-h-0 flex-1" fillHeight>
        <SectionHeader
          icon={<BadgeCheck className="h-5 w-5" />}
          title="Auditoría de Fin de Obra"
          description="Certifique la calidad de la entrega técnica y libere el finiquito de obra."
          color="emerald"
          actions={
            pendingCompletionVerify.length > 0 ? (
              <span className={`text-[10px] font-mono font-bold ${success.text600} ${success.bg50} border ${success.border100} px-2 py-0.5 rounded-lg`}>
                {pendingCompletionVerify.length} en seguimiento
              </span>
            ) : undefined
          }
        />

        {pendingCompletionVerify.length === 0 ? (
          <EmptyState message="No hay obras en ejecución o pendientes de entrega técnica en este momento." />
        ) : (
          <div ref={containerRef} className="flex-1 min-h-0">
            <Table
              columns={columns}
              data={pendingCompletionVerify}
              rowKey={(p) => p.id}
              fillViewport
              onRowClick={(p) => setDetailProjectId(p.id)}
              selectedRowKey={detailProjectId}
            />
          </div>
        )}
      </Card>

      {/* ── Modal de detalle + acción de auditoría ── */}
      <Modal
        isOpen={!!detailProject}
        onClose={closeDetail}
        maxWidth="max-w-lg"
        icon={<BadgeCheck className="h-5 w-5" />}
        iconColor="emerald"
        badge="Auditoría de Fin de Obra"
        title={detailProject ? `Expediente ${detailProject.id}` : ""}
        infoLine={detailProject ? `${detailProject.title} · ${detailProject.location}` : ""}
        footer={
          detailProject ? (
            <div className="flex justify-end">
              <Button
                id={`btn-verify-quality-${detailProject.id}`}
                onClick={() => setConfirmVerifyProject(detailProject)}
                variant="primary"
                colorScheme="emerald"
                size="md"
                icon={<BadgeCheck className="h-4 w-4" />}
              >
                {detailIsUnderAudit ? "Certificar Calidad y Autorizar Pago" : "Reportar Obra como Finalizada"}
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailProject && (
          <div className="space-y-4 text-xs">
            {/* Mini stepper de auditoría */}
            <div className="flex items-center gap-2" aria-hidden="true">
              <div className={`flex-1 h-1.5 rounded-full ${detailIsUnderAudit ? "bg-success-400" : "bg-slate-200"}`} />
              <div className={`flex-1 h-1.5 rounded-full ${detailIsUnderAudit ? "bg-success-500" : "bg-slate-100"}`} />
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
              <span className={detailIsUnderAudit ? success.text600 : "text-slate-400"}>Reportada finalizada</span>
              <span className={detailIsUnderAudit ? success.text700 : "text-slate-300"}>Certificar calidad</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                  <HardHat className="h-3 w-3" /> Contratista
                </div>
                <span className={`font-mono ${success.text700} font-bold`}>
                  {detailProject.selectedContractorCode || "Sin código"}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                  <Banknote className="h-3 w-3" /> Total (Est)
                </div>
                <span className="font-mono font-bold text-slate-700">{formatCurrency(detailProject.estimatedTotal)}</span>
              </div>
            </div>

            {detailProject.advancePaidAmount != null && detailProject.advancePaidAmount > 0 && (
              <div className={`${warning.bg50}/60 border ${warning.border100} rounded-lg px-3 py-2 text-[10px] text-slate-600 font-medium flex items-center gap-2`}>
                <Banknote className={`h-3.5 w-3.5 ${warning.icon500} shrink-0`} />
                Anticipo liberado: <strong className={`font-mono ${warning.text700}`}>{formatCurrency(detailProject.advancePaidAmount)}</strong>
                {detailProject.advancePaidDate && (
                  <span className="ml-auto inline-flex items-center gap-1 text-slate-400 font-mono">
                    <CalendarDays className="h-3 w-3" /> {detailProject.advancePaidDate}
                  </span>
                )}
              </div>
            )}

            {detailProject.cierreObraNotes && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500 leading-snug">
                <span className="font-bold text-slate-500">Revisión Inicial:</span> {detailProject.cierreObraNotes}
              </div>
            )}

            <p className="text-[10px] text-slate-400 font-medium leading-snug flex items-start gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-px" />
              {detailIsUnderAudit
                ? "La obra ya fue reportada como finalizada. Confirme la certificación de calidad para autorizar el pago."
                : "Al confirmar, solo se reporta la obra como finalizada. Luego deberá certificar la calidad en un segundo paso."}
            </p>
          </div>
        )}
      </Modal>

      {/* ── Confirm Verify Completion ── */}
      <ConfirmDialog
        isOpen={!!confirmVerifyProject}
        onClose={() => setConfirmVerifyProject(null)}
        onConfirm={() => {
          if (confirmVerifyProject) {
            onVerifyCompletion(confirmVerifyProject.id);
            setConfirmVerifyProject(null);
            closeDetail();
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
