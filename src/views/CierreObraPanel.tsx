/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Cierre de Obra: revisión de cálculos/planos + auditoría de fin de obra.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Project, ProjectStatus } from "../types";
import { useToast } from "../components/UI/Toast";
import {
  FileText,
  Upload,
  BadgeCheck,
  Calculator,
  MapPin,
  HelpCircle,
  CheckCircle2,
  FileSpreadsheet,
  Map,
} from "lucide-react";
import { containerVariants, itemVariants } from "../animations";
import { SkeletonCard, SkeletonList, SkeletonBlock } from "../components/SkeletonLoader";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import FileDropZone from "../components/UI/FileDropZone";
import EmptyState from "../components/UI/EmptyState";
import ConfirmDialog from "../components/UI/ConfirmDialog";
import StatusBadge from "../components/UI/StatusBadge";
import { formatNumber } from "../utils";

interface CierreObraPanelProps {
  projects: Project[];
  onReviewProject: (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => void;
  onVerifyCompletion: (projectId: string) => void;
  isLoading?: boolean;
}

export default function CierreObraPanel({
  projects,
  onReviewProject,
  onVerifyCompletion,
  isLoading = false,
}: CierreObraPanelProps) {
  const { showToast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [cierreNotes, setCierreNotes] = useState("");
  const [calcFiles, setCalcFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmVerifyId, setConfirmVerifyId] = useState<string | null>(null);

  if (isLoading) return <CierreObraSkeleton />;

  const pendingReview = projects.filter(p => p.status === ProjectStatus.CREADO);
  const pendingCompletionVerify = projects.filter(
    p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
  );
  const activeProject = pendingReview.find(p => p.id === selectedProjectId);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!selectedProjectId) return;
    if (!cierreNotes.trim()) {
      showToast("Introduce notas técnicas o de revisión de cálculos.", "warning");
      return;
    }
    if (calcFiles.length === 0) {
      showToast("Debe adjuntar al menos una hoja de cálculo o archivo de cubicaciones.", "warning");
      return;
    }
    if (planFiles.length === 0) {
      showToast("Debe adjuntar al menos un plano de ingeniería.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await onReviewProject(selectedProjectId, cierreNotes, planFiles, calcFiles);
      setSelectedProjectId("");
      setCierreNotes("");
      setCalcFiles([]);
      setPlanFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* SECTION 1: Pending Technical Reviews */}
      <motion.div variants={itemVariants} className="lg:col-span-7 space-y-6">
        <h1 className="sr-only">Cierre de Obra</h1>
        <Card className="border-l-4 border-l-sky-400">
          <SectionHeader
            icon={<Calculator className="h-5 w-5" />}
            title="Cierre de Obra: Revisión de Cálculos y Planos"
            description="Valide la inversión, revise la cubicación de materiales y aporte la planimetría de cierre."
            color="sky"
          />

          {pendingReview.length === 0 ? (
            <EmptyState
              message="No hay nuevas peticiones técnicas pendientes de revisión por Cierre de Obra."
              icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
            />
          ) : (
            <div className="space-y-5">
              {/* Selector List */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Seleccionar Expediente a Revisar:
                </label>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-88 overflow-y-auto pr-2 -mr-2 scroll-smooth"
                  style={{ willChange: "scroll-position" }}
                >
                  {pendingReview.map((p) => (
                    <button
                      id={`cierre-select-${p.id}`}
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setCierreNotes(`Cálculos de materiales verificados. Las cantidades indicadas para ${p.materials.length} insumos son correctas y corresponden a las necesidades técnicas de la obra en ${p.location}.`);
                      }}
                      style={{ contentVisibility: "auto", contain: "layout style paint" }}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        selectedProjectId === p.id
                          ? "border-sky-500 bg-gradient-to-br from-sky-50 to-white text-sky-950 ring-2 ring-sky-100 shadow-sm"
                          : "border-slate-200 bg-white hover:border-sky-400 hover:bg-slate-50/50 hover:shadow-sm"
                      }`}
                    >
                      <div className="font-mono text-[9px] font-bold text-sky-600 mb-1">{p.id}</div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</div>
                      <div className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {p.location}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form details */}
              <AnimatePresence>
                {activeProject && (
                  <motion.form
                    key="cierre-review-form"
                    onSubmit={handleSubmitReview}
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="border-t border-slate-100 pt-5 space-y-5 overflow-hidden"
                  >
                  <div className="p-4 bg-gradient-to-br from-sky-50/40 to-white rounded-xl border border-sky-100/60 space-y-2.5 text-xs">
                    <h5 className="font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calculator className="h-3.5 w-3.5 text-sky-500" />
                        Detalles de Inversión Propuesta:
                      </span>
                      <span className="font-mono text-sky-600 font-black">${formatNumber(activeProject.estimatedTotal)}</span>
                    </h5>
                    <p className="text-slate-600 leading-relaxed italic border-l-2 border-sky-200 pl-3">&quot;{activeProject.description}&quot;</p>
                    <div className="pt-3 border-t border-sky-100">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Materiales Solicitados:</span>
                      <ul className="mt-1.5 space-y-1 text-slate-600 font-medium">
                        {activeProject.materials.map((m) => (
                          <li key={m.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                            <span>{m.name}</span>
                            <span className="font-mono font-bold text-slate-700 ml-auto">{m.quantity} {m.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Hoja de Cálculo */}
                  <FileDropZone
                    files={calcFiles}
                    onFilesChange={setCalcFiles}
                    label="Hoja de Cálculo / Cubicaciones"
                    accept=".xlsx,.xls,.csv,.pdf,.ods,.numbers"
                    extensionsLabel=".xlsx · .xls · .csv · .pdf · .ods"
                    color="sky"
                    icon={<FileSpreadsheet className="h-6 w-6 text-slate-400" />}
                    fileIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                    id="cierre-calc-upload"
                    required
                    onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
                  />

                  {/* Planos de Ingeniería */}
                  <FileDropZone
                    files={planFiles}
                    onFilesChange={setPlanFiles}
                    label="Planos de Ingeniería"
                    accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.svg,.tif,.tiff"
                    extensionsLabel=".pdf · .dwg · .dxf · .png · .jpg · .svg"
                    color="indigo"
                    icon={<Map className="h-6 w-6 text-slate-400" />}
                    fileIcon={<Map className="h-3.5 w-3.5" />}
                    id="cierre-plan-upload"
                    required
                    countLabel="plano adjunto"
                    onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
                  />

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Notas de Revisión y Corrección
                    </label>
                    <textarea
                      id="cierre-notes"
                      rows={3}
                      placeholder="Indique los resultados de la revisión física, correcciones de cubicaciones de concreto, planos validados o andamiaje requerido."
                      value={cierreNotes}
                      onChange={(e) => setCierreNotes(e.target.value)}
                      maxLength={1000}
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white"
                    ></textarea>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{cierreNotes.length}/1000</span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="btn-cierre-submit-review"
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl transition-all duration-200 shadow-md shadow-sky-500/20 cursor-pointer hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {isSubmitting ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isSubmitting ? "Guardando..." : "Guardar y Enviar a Procura"}
                    </button>
                  </div>
                </motion.form>
              )}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>

      {/* SECTION 2: Work Completion & Quality Verification */}
      <motion.div variants={itemVariants} className="lg:col-span-5 space-y-6">
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
                        label={isUnderAudit ? "Auditoría" : "En Curso"}
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

                    <button
                      id={`btn-verify-quality-${p.id}`}
                      onClick={() => setConfirmVerifyId(p.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Certificar Calidad y Autorizar Pago
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
      </motion.div>

      {/* ── Confirm Verify Completion ── */}
      <ConfirmDialog
        isOpen={!!confirmVerifyId}
        onClose={() => setConfirmVerifyId(null)}
        onConfirm={() => {
          if (confirmVerifyId) {
            onVerifyCompletion(confirmVerifyId);
            setConfirmVerifyId(null);
          }
        }}
        title="Certificar Calidad"
        message="¿Estás seguro de certificar la calidad de esta obra? Esta acción autorizará el pago final al contratista. Una vez certificada, no podrá revertirse."
        variant="warning"
        confirmLabel="Certificar y autorizar pago"
      />
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function CierreObraSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-6">
        <SkeletonCard />
        <SkeletonList items={3} />
      </div>
      <div className="lg:col-span-5 space-y-6">
        <SkeletonCard />
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}
