/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Cierre de Obra: revisión de cálculos/planos + auditoría de fin de obra.
 */

import { useState, useRef } from "react";
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
import { SkeletonCard, SkeletonList, SkeletonBlock } from "../components/SkeletonLoader";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import FileDropZone from "../components/UI/FileDropZone";
import EmptyState from "../components/UI/EmptyState";
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
  if (isLoading) return <CierreObraSkeleton />;

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [cierreNotes, setCierreNotes] = useState("");
  const [calcFiles, setCalcFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);

  const pendingReview = projects.filter(p => p.status === ProjectStatus.CREADO);
  const pendingCompletionVerify = projects.filter(
    p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
  );
  const activeProject = pendingReview.find(p => p.id === selectedProjectId);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
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

    onReviewProject(selectedProjectId, cierreNotes, planFiles, calcFiles);
    setSelectedProjectId("");
    setCierreNotes("");
    setCalcFiles([]);
    setPlanFiles([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* SECTION 1: Pending Technical Reviews */}
      <div className="lg:col-span-7 space-y-6">
        <Card>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-88 overflow-y-auto pr-2 -mr-2 scroll-smooth">
                  {pendingReview.map((p) => (
                    <button
                      id={`cierre-select-${p.id}`}
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setCierreNotes(`Cálculos de materiales verificados. Las cantidades indicadas para ${p.materials.length} insumos son correctas y corresponden a las necesidades técnicas de la obra en ${p.location}.`);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${selectedProjectId === p.id
                          ? "border-sky-500 bg-sky-50/50 text-sky-950 ring-2 ring-sky-100"
                          : "border-slate-200 bg-white hover:border-sky-400 hover:bg-slate-50/50"
                        }`}
                    >
                      <div className="font-mono text-[9px] font-bold text-sky-600 mb-1">{p.id}</div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</div>
                      <div className="text-[10px] text-slate-500 mt-1.5 font-medium">{p.location}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form details */}
              {activeProject && (
                <form onSubmit={handleSubmitReview} className="border-t border-slate-100 pt-5 space-y-5">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                    <h5 className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Detalles de Inversión Propuesta:</span>
                      <span className="font-mono text-sky-600 font-black">${formatNumber(activeProject.estimatedTotal)}</span>
                    </h5>
                    <p className="text-slate-600 leading-relaxed italic">&quot;{activeProject.description}&quot;</p>
                    <div className="pt-3 border-t border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Materiales Solicitados:</span>
                      <ul className="mt-1.5 space-y-1 text-slate-600 list-disc list-inside font-medium">
                        {activeProject.materials.map((m) => (
                          <li key={m.id}>
                            {m.name} - <span className="font-mono font-bold text-slate-700">{m.quantity} {m.unit}</span>
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
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white"
                    ></textarea>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="btn-cierre-submit-review"
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all shadow-md shadow-sky-500/10 cursor-pointer transform hover:scale-[1.02]"
                    >
                      <Upload className="h-4 w-4" />
                      Guardar y Enviar a Procura
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* SECTION 2: Work Completion & Quality Verification */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="max-h-70 overflow-y-auto scroll-smooth">
          <SectionHeader
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Auditoría de Fin de Obra"
            description="Certifique la calidad de la entrega técnica y libere el finiquito de obra."
            color="emerald"
          />

          {pendingCompletionVerify.length === 0 ? (
            <EmptyState message="No hay obras en ejecución o pendientes de entrega técnica en este momento." />
          ) : (
            <div className="space-y-4">
              {pendingCompletionVerify.map((p) => {
                const isUnderAudit = p.status === ProjectStatus.VERIFICANDO_FINALIZACION;
                return (
                  <div key={p.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">{p.id}</span>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {p.location}
                        </div>
                      </div>
                      <StatusBadge
                        code={isUnderAudit ? "VERIFICANDO_FINALIZACION" : "EN_EJECUCION"}
                        label={isUnderAudit ? "Auditoría" : "En Curso"}
                      />
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1 font-medium">
                      <div>
                        <span className="font-bold text-slate-400">Contratista: </span>
                        <span className="font-mono text-sky-700 font-bold">{p.selectedContractorCode || "Sin código"}</span>
                      </div>
                      {p.cierreObraNotes && (
                        <p className="mt-1.5 text-slate-500 border-t border-slate-100 pt-1.5 leading-snug">
                          <strong>Revisión Inicial: </strong>{p.cierreObraNotes}
                        </p>
                      )}
                    </div>

                    <button
                      id={`btn-verify-quality-${p.id}`}
                      onClick={() => onVerifyCompletion(p.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/10 transition-colors cursor-pointer"
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
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-xs space-y-3 text-slate-600 leading-relaxed">
          <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-sky-500" />
            Flujo de Retornos en Cierre de Obra:
          </h5>
          <p className="font-medium">
            De acuerdo con los procedimientos operativos de IVOO:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-500 font-medium">
            <li>Cierre de Obra realiza la cubicación de materiales y planos de ingeniería iniciales.</li>
            <li>Al finalizar el trabajo, audita físicamente la obra y certifica si cumple con los estándares estipulados.</li>
            <li>Su aprobación final viaja a la Base de Datos para que <strong className="text-slate-700 font-bold">Finanzas</strong> proceda con la liberación del finiquito.</li>
          </ul>
        </div>
      </div>

    </div>
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
