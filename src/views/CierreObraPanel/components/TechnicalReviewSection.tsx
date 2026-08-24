/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Cierre de Obra: revisión de cálculos y planos — extraída de
 * CierreObraPanel.
 *
 * La revisión se realiza en un modal tipo wizard (Revisar → Documentación →
 * Confirmar) para no expandir el layout de la página al abrir el formulario.
 *
 * Es auditoría, no origen de documentos: el auditor revisa (preview +
 * descarga) lo que Infraestructura ya adjuntó, nunca sube archivos propios
 * en este flujo — ver ProjectDocumentsList/DocumentPreviewModal, mismo
 * patrón que RevisedDocumentsSection.tsx (mismo panel) usa para proyectos
 * ya revisados.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Calculator,
  Calendar,
  CheckCircle2,
  MapPin,
  Package,
  Paperclip,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import type { MaterialItem, Project, ProjectDocument } from "../../../types";
import { ProjectStatus } from "../../../types";
import { useToast } from "../../../components/UI/Toast";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import FileDropZone from "../../../components/UI/FileDropZone";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import { Table, type Column } from "../../../components/UI/Table";
import Stepper, { type StepDefinition } from "../../../components/UI/Stepper";
import { RequiredMark, HelpHint } from "../../../components/UI/HintSignals";
import AlertBanner from "../../../components/UI/AlertBanner";
import { formatNumber } from "../../../utils";
import { apiDownload } from "../../../services/api";
import { useAppGroupSettings } from "../../../hooks/useAppGroupSettings";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";

interface TechnicalReviewSectionProps {
  projects: Project[];
  authToken: string;
  onReviewProject: (projectId: string, notes: string) => void;
  onRejectProject: (
    projectId: string,
    reason: string,
    observations?: string,
    correctionFiles?: File[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
}

const WIZARD_STEPS: StepDefinition[] = [
  { id: "revisar", label: "Revisar", description: "Inversión y materiales" },
  { id: "documentacion", label: "Documentación", description: "Planos y cálculos" },
  { id: "confirmar", label: "Confirmar", description: "Enviar a Procura" },
];

const CONDITION_LABEL: Record<MaterialItem["condition"], string> = {
  NUEVO: "Nuevo",
  USADO: "Usado",
  AMBAS: "Nuevo o usado",
};

const WARRANTY_UNIT_LABEL: Record<NonNullable<MaterialItem["warrantyUnit"]>, string> = {
  DIAS: "días",
  MESES: "meses",
  ANOS: "años",
};

function ProjectTypeBadge({ type }: { type: Project["type"] }) {
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${
      type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
    }`}>
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: MaterialItem["condition"] }) {
  const c = SEMANTIC_COLOR_MAP[condition === "NUEVO" ? "success" : condition === "USADO" ? "warning" : "info"];
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${c.bg50} ${c.text700} shrink-0`}>
      {CONDITION_LABEL[condition]}
    </span>
  );
}

function MaterialDetailRow({ material }: { material: MaterialItem }) {
  const hasExtras = material.brand || material.model || material.warrantyValue || material.specifications || material.observations;

  return (
    <li className="py-2.5 first:pt-0 last:pb-0 border-b border-brand-100/60 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700">{material.name}</span>
          <ConditionBadge condition={material.condition} />
        </div>
        <span className="font-mono font-bold text-slate-700 shrink-0">{material.quantity} {material.unit}</span>
      </div>
      {hasExtras && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
          {(material.brand || material.model) && (
            <span>
              {material.brand}
              {material.brand && material.model ? " · " : ""}
              {material.model}
            </span>
          )}
          {material.warrantyValue != null && material.warrantyUnit && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-success-500" />
              Garantía: {material.warrantyValue} {WARRANTY_UNIT_LABEL[material.warrantyUnit]}
            </span>
          )}
          {material.specifications && <span className="italic">{material.specifications}</span>}
          {material.observations && <span className="italic">{material.observations}</span>}
        </div>
      )}
    </li>
  );
}

function AttachmentsSummary({ documents }: { documents: ProjectDocument[] }) {
  const counts = {
    FOTO: documents.filter(d => d.documentType === "FOTO").length,
    CALC: documents.filter(d => d.documentType === "CALC").length,
    PLANO: documents.filter(d => d.documentType === "PLANO").length,
  };
  const parts = [
    counts.FOTO > 0 && `${counts.FOTO} foto${counts.FOTO !== 1 ? "s" : ""}`,
    counts.CALC > 0 && `${counts.CALC} cálculo${counts.CALC !== 1 ? "s" : ""}`,
    counts.PLANO > 0 && `${counts.PLANO} plano${counts.PLANO !== 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
      <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      {parts.length > 0 ? parts.join(" · ") : "Sin adjuntos"}
    </div>
  );
}

export default function TechnicalReviewSection({ projects, authToken, onReviewProject, onRejectProject }: TechnicalReviewSectionProps) {
  const { showToast } = useToast();
  const { maxFileSizeBytes } = useAppGroupSettings();
  const { containerRef } = useContainerRows({ paginated: false });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [cierreNotes, setCierreNotes] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectObservations, setRejectObservations] = useState("");
  const [rejectCorrectionFiles, setRejectCorrectionFiles] = useState<File[]>([]);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const pendingReview = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CREADO),
    [projects],
  );
  const activeProject = pendingReview.find(p => p.id === selectedProjectId);
  const activeDocuments = activeProject?.documents ?? [];

  const columns: Column<Project>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className={`font-mono font-bold text-[10px] ${brand.text600} whitespace-nowrap`}>{p.id}</span>,
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
      key: "createdDate",
      label: "Fecha",
      width: "7rem",
      sortable: true,
      render: (p) => <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{p.createdDate}</span>,
    },
    {
      key: "materials",
      label: "Insumos",
      width: "6rem",
      align: "right",
      render: (p) => <span className="font-mono text-[11px] font-bold text-slate-600">{p.materials.length}</span>,
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "7.5rem",
      align: "right",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-slate-800 whitespace-nowrap">${formatNumber(p.estimatedTotal)}</span>,
    },
  ];

  const openReview = (p: Project) => {
    setSelectedProjectId(p.id);
    setStepIndex(0);
    setFurthestStepIndex(0);
    setCierreNotes("");
  };

  const closeReview = () => {
    if (isSubmitting) return;
    setSelectedProjectId("");
    setStepIndex(0);
    setFurthestStepIndex(0);
    setCierreNotes("");
  };

  const openRejectModal = () => {
    setRejectReason("");
    setRejectObservations("");
    setRejectCorrectionFiles([]);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    if (isSubmittingRejection) return;
    setShowRejectModal(false);
    setRejectReason("");
    setRejectObservations("");
    setRejectCorrectionFiles([]);
  };

  const handleConfirmReject = async () => {
    if (!activeProject || !rejectReason.trim() || isSubmittingRejection) return;
    setIsSubmittingRejection(true);
    try {
      await onRejectProject(activeProject.id, rejectReason.trim(), rejectObservations.trim(), rejectCorrectionFiles);
      setShowRejectModal(false);
      setRejectReason("");
      setRejectObservations("");
      setRejectCorrectionFiles([]);
      closeReview();
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleDownload = async (doc: ProjectDocument) => {
    if (!activeProject) return;
    try {
      const blob = await apiDownload(`/projects/${activeProject.id}/documents/${doc.id}/download`, { token: authToken });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  const handleSubmitReview = async () => {
    if (!activeProject || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onReviewProject(activeProject.id, cierreNotes);
      setSelectedProjectId("");
      setStepIndex(0);
      setFurthestStepIndex(0);
      setCierreNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const brand = SEMANTIC_COLOR_MAP.brand;
  const danger = SEMANTIC_COLOR_MAP.danger;

  return (
    <Card accent="brand" className="min-h-0 flex-1" fillHeight>
      <SectionHeader
        icon={<Calculator className="h-5 w-5" />}
        title="Cierre de Obra: Revisión de Cálculos y Planos"
        description="Valide la inversión, revise la cubicación de materiales y aporte la planimetría de cierre."
        color="sky"
      />

      {pendingReview.length === 0 ? (
        <EmptyState
          message="No hay nuevas peticiones técnicas pendientes de revisión por Cierre de Obra."
          icon={<CheckCircle2 className="h-10 w-10 text-success-500" />}
        />
      ) : (
        <div className="min-h-0 flex-1 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Seleccionar Expediente a Revisar:
            </label>
            <span className={`text-[10px] font-mono font-bold ${brand.text600} ${brand.bg50} border ${brand.border100} px-2 py-0.5 rounded-lg`}>
              {pendingReview.length} pendiente{pendingReview.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div ref={containerRef} className="flex-1 min-h-0">
            <Table
              columns={columns}
              data={pendingReview}
              rowKey={(p) => p.id}
              fillViewport
              onRowClick={(p) => openReview(p)}
              selectedRowKey={selectedProjectId}
            />
          </div>
        </div>
      )}

      {/* ── Wizard de revisión ── */}
      <Modal
        isOpen={!!activeProject}
        onClose={closeReview}
        maxWidth="max-w-3xl"
        icon={<Calculator className="h-5 w-5" />}
        iconColor="sky"
        badge="Revisión Técnica"
        title={activeProject ? `Expediente ${activeProject.id}` : ""}
        infoLine={activeProject ? `${activeProject.title} · ${activeProject.location}` : ""}
        footer={
          activeProject ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {stepIndex === 2
                  ? "Expediente listo para enviar a Procura"
                  : stepIndex === 1
                    ? "Revise los adjuntos de la petición"
                    : "Revisa el detalle de la inversión"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  id="btn-cierre-reject-project"
                  variant="danger"
                  disabled={isSubmitting}
                  onClick={openRejectModal}
                  icon={<XCircle className="h-4 w-4" />}
                >
                  Rechazar
                </Button>
                {stepIndex > 0 && (
                  <Button variant="secondary" disabled={isSubmitting} onClick={() => setStepIndex(s => s - 1)}>
                    Atrás
                  </Button>
                )}
                {stepIndex < 2 ? (
                  <Button
                    variant="primary"
                    colorScheme="sky"
                    onClick={() => {
                      const next = stepIndex + 1;
                      setStepIndex(next);
                      setFurthestStepIndex((f) => Math.max(f, next));
                    }}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    id="btn-cierre-submit-review"
                    variant="primary"
                    colorScheme="sky"
                    isLoading={isSubmitting}
                    onClick={handleSubmitReview}
                    icon={<Upload className="h-4 w-4" />}
                  >
                    {isSubmitting ? "Enviando..." : "Guardar y Enviar a Procura"}
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {activeProject && (
          <div className="space-y-6">
            <Stepper
              steps={WIZARD_STEPS}
              currentIndex={stepIndex}
              furthestVisitedIndex={furthestStepIndex}
              onStepClick={setStepIndex}
              ariaLabel="Progreso de revisión"
            />

            {/* Paso 1: Revisar expediente */}
            {stepIndex === 0 && (
              <div className="space-y-5">
                <div className={`p-4 bg-linear-to-br from-brand-50/40 to-white rounded-xl border ${brand.border100}/60 space-y-3 text-xs`}>
                  {/* Metadatos del expediente */}
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 pb-3 border-b ${brand.border100}`}>
                    <ProjectTypeBadge type={activeProject.type} />
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activeProject.location}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {activeProject.createdDate}
                    </span>
                    <span className="ml-auto">
                      <AttachmentsSummary documents={activeDocuments} />
                    </span>
                  </div>

                  <h5 className="font-bold text-slate-700 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Calculator className={`h-3.5 w-3.5 ${brand.icon500}`} />
                      Detalles de Inversión Propuesta:
                    </span>
                    <span className={`font-mono ${brand.text600} font-black`}>${formatNumber(activeProject.estimatedTotal)}</span>
                  </h5>
                  <p className="text-slate-600 leading-relaxed italic border-l-2 border-brand-200 pl-3">&quot;{activeProject.description}&quot;</p>

                  <div className={`pt-3 border-t ${brand.border100}`}>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1.5 mb-1">
                      <Package className="h-3 w-3" />
                      Materiales Solicitados
                    </span>
                    <ul>
                      {activeProject.materials.map((m) => (
                        <MaterialDetailRow key={m.id ?? m.name} material={m} />
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label htmlFor="cierre-notes" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Notas de Revisión y Corrección (opcional)
                    </label>
                    <HelpHint content="Deje constancia de correcciones de cubicación, planos validados o requerimientos de andamiaje. No es obligatorio para continuar." />
                  </div>
                  <textarea
                    id="cierre-notes"
                    rows={3}
                    placeholder="Indique los resultados de la revisión física, correcciones de cubicaciones de concreto, planos validados o andamiaje requerido."
                    value={cierreNotes}
                    onChange={(e) => setCierreNotes(e.target.value)}
                    maxLength={1000}
                    className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-brand-500 bg-white"
                  ></textarea>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{cierreNotes.length}/1000</span>
                </div>
              </div>
            )}

            {/* Paso 2: Revisar documentación adjunta (sin subida — Cierre de
                Obra audita lo que Infraestructura ya cargó) */}
            {stepIndex === 1 && (
              <div className="space-y-4">
                {activeDocuments.length === 0 ? (
                  <EmptyState
                    message="Esta petición no trae fotos, cálculos ni planos adjuntos. Puede continuar con la revisión o rechazarla si considera que falta documentación."
                    icon={<Paperclip className="h-8 w-8" />}
                  />
                ) : (
                  <ProjectDocumentsList
                    project={activeProject}
                    authToken={authToken}
                    onDownload={handleDownload}
                    onPreview={setPreviewDoc}
                  />
                )}
              </div>
            )}

            {/* Paso 3: Confirmar envío */}
            {stepIndex === 2 && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Expediente</span>
                    <span className="font-mono font-black text-slate-800">{activeProject.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Inversión Propuesta</span>
                    <span className={`font-mono font-black ${brand.text600}`}>${formatNumber(activeProject.estimatedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Adjuntos revisados</span>
                    <AttachmentsSummary documents={activeDocuments} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px] shrink-0">Notas</span>
                    <span className="font-medium text-slate-600 text-right leading-snug">{cierreNotes || "—"}</span>
                  </div>
                </div>

                <AlertBanner
                  type="success"
                  icon={<Award className="h-4 w-4 shrink-0" />}
                  message="Al enviar, el expediente pasará a Procura para la aprobación de inversión."
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {activeProject && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          projectId={activeProject.id}
          document={previewDoc}
          authToken={authToken}
          onDownload={handleDownload}
        />
      )}

      {/* ── Modal de rechazo de la petición ── */}
      <Modal
        isOpen={showRejectModal}
        onClose={closeRejectModal}
        maxWidth="max-w-md"
        icon={<AlertTriangle className="h-5 w-5" />}
        iconColor="rose"
        badge="Rechazo de petición"
        title={activeProject ? `Rechazar ${activeProject.id}` : ""}
        infoLine={activeProject ? activeProject.title : ""}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeRejectModal} disabled={isSubmittingRejection}>
              Cancelar
            </Button>
            <Button
              id="btn-confirm-reject-project"
              variant="primary"
              colorScheme="rose"
              onClick={handleConfirmReject}
              disabled={isSubmittingRejection || !rejectReason.trim()}
              isLoading={isSubmittingRejection}
              icon={<XCircle className="h-3.5 w-3.5" />}
            >
              {isSubmittingRejection ? "Rechazando..." : "Confirmar rechazo"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className={`text-xs ${danger.text600}/80 font-medium leading-relaxed`}>
            La petición volverá a Infraestructura para que corrija lo indicado y la reenvíe. No se crea una petición nueva.
          </p>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="reject-project-reason" className={`text-[10px] font-bold uppercase tracking-wider ${danger.text600}`}>
                Motivo del rechazo
              </label>
              <RequiredMark filled={!!rejectReason.trim()} />
            </div>
            <textarea
              id="reject-project-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej. La descripción no detalla el alcance del trabajo. Los materiales cargados no corresponden al tipo de obra."
              className="w-full rounded-xl border border-danger-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-danger-400 focus:ring-2 focus:ring-danger-100 resize-none"
            />
            <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{rejectReason.length}/500</span>
          </div>

          <div>
            <label htmlFor="reject-project-observations" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Observaciones (opcional)
            </label>
            <textarea
              id="reject-project-observations"
              value={rejectObservations}
              onChange={(e) => setRejectObservations(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Detalles adicionales para Infraestructura, aparte del motivo principal."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
            />
            <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{rejectObservations.length}/1000</span>
          </div>

          <FileDropZone
            files={rejectCorrectionFiles}
            onFilesChange={setRejectCorrectionFiles}
            label="Correcciones (opcional)"
            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
            extensionsLabel=".pdf · .dwg · .dxf · .png · .jpg · .xlsx · .csv"
            color="rose"
            icon={<AlertTriangle className="h-6 w-6 text-slate-400" />}
            fileIcon={<AlertTriangle className="h-3.5 w-3.5" />}
            id="reject-project-corrections-upload"
            maxSizeBytes={maxFileSizeBytes}
            onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
          />
        </div>
      </Modal>
    </Card>
  );
}
