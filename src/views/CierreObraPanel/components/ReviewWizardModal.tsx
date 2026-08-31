/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wizard de revisión técnica (Revisar → Documentación → Confirmar) para un
 * expediente CREADO — extraído de TechnicalReviewSection.tsx. Mantiene su
 * propio estado de progreso (paso actual, notas, preview de documento)
 * aislado del resto del panel de Cierre de Obra.
 *
 * Es auditoría, no origen de documentos: el auditor revisa (preview +
 * descarga) lo que Infraestructura ya adjuntó, nunca sube archivos propios
 * en este flujo — ver ProjectDocumentsList/DocumentPreviewModal, mismo
 * patrón que RevisedDocumentsSection.tsx (mismo panel) usa para proyectos
 * ya revisados.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  ArrowRight,
  Calculator,
  Calendar,
  MapPin,
  Package,
  Paperclip,
  Upload,
  XCircle,
} from "lucide-react";
import type { Project, ProjectDocument } from "../../../types";
import { useToast } from "../../../components/UI/Toast";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import Stepper, { type StepDefinition } from "../../../components/UI/Stepper";
import { HelpHint } from "../../../components/UI/HintSignals";
import AlertBanner from "../../../components/UI/AlertBanner";
import DossierEvaluationPanel from "./DossierEvaluationPanel";
import { AttachmentsSummary, MaterialDetailRow, ProjectTypeBadge } from "./TechnicalReviewPresentational";
import { formatNumber } from "../../../utils";
import { downloadProjectDocument } from "../../../services/api";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { springs } from "../../../animations";
import { useCurrencyConversion } from "../../../hooks/useCurrencyConversion";
import BsAmount from "../../../components/UI/BsAmount";

const WIZARD_STEPS: StepDefinition[] = [
  { id: "revisar", label: "Revisar", description: "Inversión y materiales" },
  { id: "documentacion", label: "Documentación", description: "Planos y cálculos" },
  { id: "confirmar", label: "Confirmar", description: "Enviar a Procura" },
];

interface ReviewWizardModalProps {
  project: Project | undefined;
  authToken: string;
  onReviewProject: (projectId: string, notes: string) => void;
  onSyncProject: (project: Project) => void;
  onClose: () => void;
  onOpenRejectModal: () => void;
}

export default function ReviewWizardModal({ project, authToken, onReviewProject, onSyncProject, onClose, onOpenRejectModal }: ReviewWizardModalProps) {
  const { showToast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [cierreNotes, setCierreNotes] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brand = SEMANTIC_COLOR_MAP.brand;
  const activeDocuments = project?.documents ?? [];
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  const resetWizard = () => {
    setStepIndex(0);
    setFurthestStepIndex(0);
    setCierreNotes("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetWizard();
    onClose();
  };

  const handleDownload = async (doc: ProjectDocument) => {
    if (!project) return;
    try {
      await downloadProjectDocument(project.id, doc, authToken);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  const handleSubmitReview = async () => {
    if (!project || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onReviewProject(project.id, cierreNotes);
      resetWizard();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={!!project}
        onClose={handleClose}
        maxWidth="max-w-3xl"
        icon={<Calculator className="h-5 w-5" />}
        iconColor="sky"
        badge="Revisión Técnica"
        title={project ? `Expediente ${project.id}` : ""}
        infoLine={project ? `${project.title} · ${project.location}` : ""}
        footer={
          project ? (
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
                  onClick={onOpenRejectModal}
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
        {project && (
          <div className="space-y-6">
            <DossierEvaluationPanel
              project={project}
              authToken={authToken}
              onEvaluated={onSyncProject}
            />

            <Stepper
              steps={WIZARD_STEPS}
              currentIndex={stepIndex}
              furthestVisitedIndex={furthestStepIndex}
              onStepClick={setStepIndex}
              ariaLabel="Progreso de revisión"
            />

            <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={springs.snappy}
            >
            {/* Paso 1: Revisar expediente */}
            {stepIndex === 0 && (
              <div className="space-y-5">
                <div className={`p-4 bg-linear-to-br from-brand-50/40 to-white rounded-xl border ${brand.border100}/60 space-y-3 text-xs`}>
                  {/* Metadatos del expediente */}
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 pb-3 border-b ${brand.border100}`}>
                    <ProjectTypeBadge type={project.type} />
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {project.location}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {project.createdDate}
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
                    <span className="text-right">
                      <span className={`font-mono ${brand.text600} font-black block`}>${formatNumber(project.estimatedTotal)}</span>
                      <BsAmount amount={project.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                    </span>
                  </h5>
                  <p className="text-slate-600 leading-relaxed italic border-l-2 border-brand-200 pl-3">&quot;{project.description}&quot;</p>

                  <div className={`pt-3 border-t ${brand.border100}`}>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1.5 mb-1">
                      <Package className="h-3 w-3" />
                      Materiales Solicitados
                    </span>
                    <ul>
                      {project.materials.map((m) => (
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
                    project={project}
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
                    <span className="font-mono font-black text-slate-800">{project.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Inversión Propuesta</span>
                    <span className="text-right">
                      <span className={`font-mono font-black ${brand.text600} block`}>${formatNumber(project.estimatedTotal)}</span>
                      <BsAmount amount={project.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                    </span>
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
            </motion.div>
            </AnimatePresence>
          </div>
        )}
      </Modal>

      {project && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          projectId={project.id}
          document={previewDoc}
          authToken={authToken}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}
