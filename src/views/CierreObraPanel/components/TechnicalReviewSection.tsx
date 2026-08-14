/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Cierre de Obra: revisión de cálculos y planos — extraída de
 * CierreObraPanel.
 *
 * La revisión se realiza en un modal tipo wizard (Revisar → Documentación →
 * Confirmar) para no expandir el layout de la página al abrir el formulario.
 */

import { Fragment, useMemo, useState } from "react";
import { ArrowRight, Calculator, CheckCircle2, FileSpreadsheet, Map, MapPin, Send, Upload } from "lucide-react";
import type { Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import { useToast } from "../../../components/UI/Toast";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import FileDropZone from "../../../components/UI/FileDropZone";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import { formatNumber } from "../../../utils";
import { useAppGroupSettings } from "../../../hooks/useAppGroupSettings";

interface TechnicalReviewSectionProps {
  projects: Project[];
  onReviewProject: (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => void;
}

const WIZARD_STEPS = [
  { key: 1, label: "Revisar", icon: Calculator },
  { key: 2, label: "Documentación", icon: FileSpreadsheet },
  { key: 3, label: "Confirmar", icon: Send },
] as const;

function ProjectTypeBadge({ type }: { type: Project["type"] }) {
  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap ${
      type === "INFRAESTRUCTURA" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-700 border-slate-200"
    }`}>
      {type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
    </span>
  );
}

export default function TechnicalReviewSection({ projects, onReviewProject }: TechnicalReviewSectionProps) {
  const { showToast } = useToast();
  const { maxFileSizeBytes } = useAppGroupSettings();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [step, setStep] = useState(1);
  const [cierreNotes, setCierreNotes] = useState("");
  const [calcFiles, setCalcFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingReview = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CREADO),
    [projects],
  );
  const activeProject = pendingReview.find(p => p.id === selectedProjectId);

  const openReview = (p: Project) => {
    setSelectedProjectId(p.id);
    setStep(1);
    setCalcFiles([]);
    setPlanFiles([]);
    setCierreNotes(`Cálculos de materiales verificados. Las cantidades indicadas para ${p.materials.length} insumos son correctas y corresponden a las necesidades técnicas de la obra en ${p.location}.`);
  };

  const closeReview = () => {
    if (isSubmitting) return;
    setSelectedProjectId("");
    setStep(1);
    setCalcFiles([]);
    setPlanFiles([]);
    setCierreNotes("");
  };

  const handleNextStep = () => {
    if (step === 2) {
      if (calcFiles.length === 0) {
        showToast("Debe adjuntar al menos una hoja de cálculo o archivo de cubicaciones.", "warning");
        return;
      }
      if (planFiles.length === 0) {
        showToast("Debe adjuntar al menos un plano de ingeniería.", "warning");
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmitReview = async () => {
    if (!activeProject || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onReviewProject(activeProject.id, cierreNotes, planFiles, calcFiles);
      setSelectedProjectId("");
      setStep(1);
      setCalcFiles([]);
      setPlanFiles([]);
      setCierreNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = calcFiles.length > 0 && planFiles.length > 0 && cierreNotes.trim().length > 0;

  return (
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
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Seleccionar Expediente a Revisar:
            </label>
            <span className="text-[10px] font-mono font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-lg">
              {pendingReview.length} pendiente{pendingReview.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-88 overflow-y-auto pr-2 -mr-2 pb-2 scroll-smooth scroll-pb-2"
          >
            {pendingReview.map((p) => {
              const isSelected = selectedProjectId === p.id;
              return (
                <button
                  id={`cierre-select-${p.id}`}
                  key={p.id}
                  type="button"
                  onClick={() => openReview(p)}
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-sky-500 bg-gradient-to-br from-sky-50 to-white text-sky-950 ring-2 ring-sky-100 shadow-sm"
                      : "border-slate-200 bg-white hover:border-sky-400 hover:bg-slate-50/50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[9px] font-bold text-sky-600">{p.id}</span>
                    <ProjectTypeBadge type={p.type} />
                  </div>
                  <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {p.location}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{p.createdDate}</span>
                    <span className="text-[10px] font-medium text-slate-500">
                      {p.materials.length} insumo{p.materials.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Wizard de revisión ── */}
      <Modal
        isOpen={!!activeProject}
        onClose={closeReview}
        maxWidth="max-w-2xl"
        icon={<Calculator className="h-5 w-5" />}
        iconColor="sky"
        badge="Revisión Técnica"
        title={activeProject ? `Expediente ${activeProject.id}` : ""}
        infoLine={activeProject ? `${activeProject.title} · ${activeProject.location}` : ""}
        footer={
          activeProject ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {step === 3
                  ? isComplete
                    ? "Expediente listo para enviar a Procura"
                    : "Faltan requisitos para enviar"
                  : step === 2
                    ? "Adjunta al menos un archivo por tipo"
                    : "Revisa el detalle de la inversión"}
              </span>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button variant="secondary" disabled={isSubmitting} onClick={() => setStep(s => s - 1)}>
                    Atrás
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    variant="primary"
                    colorScheme="sky"
                    onClick={handleNextStep}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    id="btn-cierre-submit-review"
                    variant="primary"
                    colorScheme="sky"
                    disabled={!isComplete}
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
            {/* Stepper del wizard */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Progreso de revisión">
              {WIZARD_STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === s.key;
                const isDone = step > s.key;
                return (
                  <Fragment key={s.key}>
                    {i > 0 && (
                      <div className={`h-0.5 flex-1 rounded-full ${step > i ? "bg-sky-400" : "bg-slate-200"}`} />
                    )}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all duration-200 ${
                        isActive
                          ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      <span className={isActive ? "text-sky-500" : isDone ? "text-emerald-500" : "text-slate-300"}>
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                      </span>
                      {s.label}
                    </div>
                  </Fragment>
                );
              })}
            </div>

            {/* Paso 1: Revisar expediente */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="p-4 bg-gradient-to-br from-sky-50/40 to-white rounded-xl border border-sky-100/60 space-y-2.5 text-xs">
                  <h5 className="font-bold text-slate-700 flex items-center justify-between gap-2">
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
              </div>
            )}

            {/* Paso 2: Adjuntar documentación */}
            {step === 2 && (
              <div className="space-y-5">
                <FileDropZone
                  files={calcFiles}
                  onFilesChange={setCalcFiles}
                  label="Hoja de Cálculo / Cubicaciones"
                  accept=".xlsx,.xls,.csv,.pdf,.ods"
                  extensionsLabel=".xlsx · .xls · .csv · .pdf · .ods"
                  color="sky"
                  icon={<FileSpreadsheet className="h-6 w-6 text-slate-400" />}
                  fileIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                  id="cierre-calc-upload"
                  required
                  maxSizeBytes={maxFileSizeBytes}
                  onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
                />

                <FileDropZone
                  files={planFiles}
                  onFilesChange={setPlanFiles}
                  label="Planos de Ingeniería"
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.svg,.tif,.tiff"
                  extensionsLabel=".pdf · .dwg · .dxf · .png · .jpg · .svg"
                  color="indigo"
                  icon={<Map className="h-6 w-6 text-slate-400" />}
                  fileIcon={<Map className="h-3.5 w-3.5" />}
                  maxSizeBytes={maxFileSizeBytes}
                  id="cierre-plan-upload"
                  required
                  countLabel="plano adjunto"
                  onFileRejected={(name, reason) => showToast(`${name}: ${reason}`, "error")}
                />
              </div>
            )}

            {/* Paso 3: Confirmar envío */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Expediente</span>
                    <span className="font-mono font-black text-slate-800">{activeProject.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Inversión Propuesta</span>
                    <span className="font-mono font-black text-sky-600">${formatNumber(activeProject.estimatedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Hoja de Cálculo</span>
                    <span className="font-medium text-slate-600 truncate">{calcFiles.map(f => f.name).join(", ") || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Planos</span>
                    <span className="font-medium text-slate-600 truncate">{planFiles.map(f => f.name).join(", ") || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px] shrink-0">Notas</span>
                    <span className="font-medium text-slate-600 text-right leading-snug">{cierreNotes}</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-[11px] font-bold ${
                  isComplete
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-amber-50 border-amber-100 text-amber-700"
                }`}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {isComplete
                    ? "Todos los requisitos están completos. Al enviar, el expediente pasará a Procura para la aprobación de inversión."
                    : "Faltan requisitos para enviar: revisa la documentación adjunta."}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
