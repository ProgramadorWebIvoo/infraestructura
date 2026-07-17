/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Project, ProjectStatus } from "../types";
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
  X,
  Paperclip,
  FilePlus2,
} from "lucide-react";
import { SkeletonBlock, SkeletonCard, SkeletonList } from "./SkeletonLoader";

interface CierreObraPanelProps {
  projects: Project[];
  onReviewProject: (projectId: string, notes: string, planFiles: File[], calcFiles: File[]) => void;
  onVerifyCompletion: (projectId: string) => void;
  isLoading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CierreObraPanel({
  projects,
  onReviewProject,
  onVerifyCompletion,
  isLoading = false,
}: CierreObraPanelProps) {
  if (isLoading) return <CierreObraSkeleton />;
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [cierreNotes, setCierreNotes] = useState("");
  const [calcFiles, setCalcFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [isDraggingCalc, setIsDraggingCalc] = useState(false);
  const [isDraggingPlan, setIsDraggingPlan] = useState(false);

  const calcInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const pendingReview = projects.filter(p => p.status === ProjectStatus.CREADO);
  const pendingCompletionVerify = projects.filter(
    p => p.status === ProjectStatus.EN_EJECUCION || p.status === ProjectStatus.VERIFICANDO_FINALIZACION
  );

  const activeProject = pendingReview.find(p => p.id === selectedProjectId);

  const addFiles = (current: File[], incoming: FileList): File[] => {
    const existing = new Set(current.map(f => f.name + f.size));
    const merged = [...current];
    Array.from(incoming).forEach(f => {
      if (!existing.has(f.name + f.size)) merged.push(f);
    });
    return merged;
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!cierreNotes.trim()) {
      alert("Por favor, introduce notas técnicas o de revisión de cálculos.");
      return;
    }
    if (calcFiles.length === 0) {
      alert("Debe adjuntar al menos una hoja de cálculo o archivo de cubicaciones.");
      return;
    }
    if (planFiles.length === 0) {
      alert("Debe adjuntar al menos un plano de ingeniería.");
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-6">
            <div className="bg-sky-50 text-sky-600 p-2.5 rounded-xl border border-sky-100">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base">Cierre de Obra: Revisión de Cálculos y Planos</h3>
              <p className="text-xs text-slate-500 font-medium">Valide la inversión, revise la cubicación de materiales y aporte la planimetría de cierre.</p>
            </div>
          </div>

          {pendingReview.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">¡Al día!</p>
              <p className="text-xs text-slate-500 mt-1">No hay nuevas peticiones técnicas pendientes de revisión por Cierre de Obra.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Selector List */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seleccionar Expediente a Revisar:</label>
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
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedProjectId === p.id
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
                      <span className="font-mono text-sky-600 font-black">${activeProject.estimatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </h5>
                    <p className="text-slate-600 leading-relaxed italic">"{activeProject.description}"</p>
                    <div className="pt-3 border-t border-slate-200/60">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Materiales Solicitados:</span>
                      <ul className="mt-1.5 space-y-1 text-slate-600 list-disc list-inside font-medium">
                        {activeProject.materials.map((m) => (
                          <li key={m.id}>
                            {m.name} - <span className="font-mono font-bold text-slate-700">{m.quantity} {m.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* ── Hoja de Cálculo / Cubicaciones ── */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-sky-500" />
                      Hoja de Cálculo / Cubicaciones
                      <span className="text-rose-500">*</span>
                    </label>

                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingCalc(true); }}
                      onDragEnter={() => setIsDraggingCalc(true)}
                      onDragLeave={() => setIsDraggingCalc(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingCalc(false);
                        if (e.dataTransfer.files.length) setCalcFiles(f => addFiles(f, e.dataTransfer.files));
                      }}
                      onClick={() => calcInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        isDraggingCalc ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/30"
                      }`}
                    >
                      <FilePlus2 className="h-6 w-6 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500">Arrastra o haz clic para adjuntar</span>
                      <span className="text-[10px] text-slate-400 font-medium">.xlsx · .xls · .csv · .pdf · .ods</span>
                      <input
                        ref={calcInputRef}
                        id="cierre-calc-upload"
                        type="file"
                        multiple
                        accept=".xlsx,.xls,.csv,.pdf,.ods,.numbers"
                        className="hidden"
                        onChange={(e) => { 
                          console.log("Files selected:", e.target.files);
                          if (e.target.files) setCalcFiles([...e.target.files, ...calcFiles]); e.target.value = ""; 
                        }}
                      />
                    </div>

                    {/* Attached calc files */}
                    {calcFiles.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {calcFiles.map((file, i) => (
                          <li key={i} className="flex items-center justify-between bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileSpreadsheet className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                              <span className="text-[11px] font-bold text-sky-800 truncate">{file.name}</span>
                              <span className="text-[10px] text-sky-400 font-medium shrink-0">{formatFileSize(file.size)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCalcFiles(f => f.filter((_, idx) => idx !== i))}
                              className="ml-2 text-sky-300 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* ── Planos de Ingeniería ── */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Map className="h-3.5 w-3.5 text-indigo-500" />
                      Planos de Ingeniería
                      <span className="text-rose-500">*</span>
                    </label>

                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingPlan(true); }}
                      onDragEnter={() => setIsDraggingPlan(true)}
                      onDragLeave={() => setIsDraggingPlan(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingPlan(false);
                        if (e.dataTransfer.files.length) setPlanFiles(f => addFiles(f, e.dataTransfer.files));
                      }}
                      onClick={() => planInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        isDraggingPlan ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30"
                      }`}
                    >
                      <Paperclip className="h-6 w-6 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500">Arrastra o haz clic para adjuntar</span>
                      <span className="text-[10px] text-slate-400 font-medium">.pdf · .dwg · .dxf · .png · .jpg · .svg</span>
                      <input
                        ref={planInputRef}
                        id="cierre-plan-upload"
                        type="file"
                        multiple
                        accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.svg,.tif,.tiff"
                        className="hidden"
                        onChange={(e) => { if (e.target.files) setPlanFiles([...e.target.files, ...planFiles] ); e.target.value = ""; }}
                      />
                    </div>

                    {/* Attached plan files */}
                    {planFiles.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {planFiles.map((file, i) => (
                          <li key={i} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="text-[11px] font-bold text-indigo-800 truncate">{file.name}</span>
                              <span className="text-[10px] text-indigo-400 font-medium shrink-0">{formatFileSize(file.size)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPlanFiles(f => f.filter((_, idx) => idx !== i))}
                              className="ml-2 text-indigo-300 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Counter badge */}
                    {planFiles.length > 0 && (
                      <p className="mt-1.5 text-[10px] font-bold text-indigo-600 text-right">
                        {planFiles.length} {planFiles.length === 1 ? "plano adjunto" : "planos adjuntos"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas de Revisión y Corrección</label>
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
        </div>
      </div>

      {/* SECTION 2: Work Completion & Quality Verification */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300 grid grid-cols-1 p  -2 -mr-2 scroll-smooth overflow-y-auto max-h-65">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-5">
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base">Auditoría de Fin de Obra</h3>
              <p className="text-xs text-slate-500 font-medium">Certifique la calidad de la entrega técnica y libere el finiquito de obra.</p>
            </div>
          </div>

          {pendingCompletionVerify.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 italic font-medium">No hay obras en ejecución o pendientes de entrega técnica en este momento.</p>
            </div>
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
                      <span className={`text-[9px] font-mono px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${
                        isUnderAudit ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-sky-100 text-sky-800 border border-sky-200 animate-pulse"
                      }`}>
                        {isUnderAudit ? "Auditoría" : "En Curso"}
                      </span>
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
        </div>

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
