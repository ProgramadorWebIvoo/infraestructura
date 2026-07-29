/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Cierre de Obra: revisión de cálculos y planos — extraída de
 * CierreObraPanel.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/UI/Button";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";
import { useToast } from "../../components/UI/Toast";
import { Calculator, CheckCircle2, FileSpreadsheet, Map, MapPin, Upload } from "lucide-react";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import FileDropZone from "../../components/UI/FileDropZone";
import EmptyState from "../../components/UI/EmptyState";
import { formatNumber } from "../../utils";

interface TechnicalReviewSectionProps {
  projects: Project[];
  onReviewProject: (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => void;
}

export default function TechnicalReviewSection({ projects, onReviewProject }: TechnicalReviewSectionProps) {
  const { showToast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [cierreNotes, setCierreNotes] = useState("");
  const [calcFiles, setCalcFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingReview = projects.filter(p => p.status === ProjectStatus.CREADO);
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
                <Button
                  id="btn-cierre-submit-review"
                  type="submit"
                  variant="primary"
                  colorScheme="sky"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  icon={<Upload className="h-4 w-4" />}
                >
                  {isSubmitting ? "Guardando..." : "Guardar y Enviar a Procura"}
                </Button>
              </div>
            </motion.form>
          )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
