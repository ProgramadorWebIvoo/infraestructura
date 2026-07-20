/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Project, ProjectStatus, Proposal } from "../types";
import { useToast } from "../components/UI/Toast";
import {
  FileSearch,
  DollarSign,
  Briefcase,
  CheckCircle,
  Users,
  Clock,
  TrendingUp,
  CheckSquare,
  ShieldCheck,
  ChevronDown,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Map,
  Download,
  BrainCircuit,
} from "lucide-react";
import { ProjectDocument } from "../types";
import EvaluacionInteligenteModal from "../components/EvaluacionInteligenteModal";
import { SkeletonCard, SkeletonTable } from "../components/SkeletonLoader";
import { apiDownload } from "../services/api";

interface ProcuraPanelProps {
  projects: Project[];
  onApproveInvestment: (projectId: string, notes: string, approvedAmount: number) => void;
  onSelectContractor: (projectId: string, contractorCode: string, proposalId: string) => Promise<void>;
  onRejectProposals: (projectId: string, reason: string) => void;
  authToken: string;
  isLoading?: boolean;
}

export default function ProcuraPanel({
  projects,
  onApproveInvestment,
  onSelectContractor,
  onRejectProposals,
  authToken,
  isLoading = false,
}: ProcuraPanelProps) {
  const { showToast } = useToast();
  if (isLoading) return <ProcuraSkeleton />;

  const handleDownload = async (projectId: string, doc: ProjectDocument) => {
    try {
      const blob = await apiDownload(`/projects/${projectId}/documents/${doc.id}/download`, { token: authToken });
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
  // Phase 1 form state
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [procuraNotes, setProcuraNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");

  // Rejection state
  const [rejectingProjectId, setRejectingProjectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // AI Evaluation modal state
  const [aiEvalProject, setAiEvalProject] = useState<Project | null>(null);

  const pendingInvestmentApproval = projects.filter(p => p.status === ProjectStatus.REVISADO_CIERRE);
  const pendingContractSelection = projects.filter(p => p.status === ProjectStatus.COMPARATIVA_ENVIADA);

  const activeReviewProject = pendingInvestmentApproval.find(p => p.id === selectedReviewId);

  const handleApproveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId) return;
    const amountNum = approvedAmount === "" ? 0 : approvedAmount;
    if (amountNum <= 0) {
      showToast("Introduce un monto de inversión autorizado válido.", "warning");
      return;
    }
    onApproveInvestment(selectedReviewId, procuraNotes, amountNum);
    setSelectedReviewId("");
    setProcuraNotes("");
    setApprovedAmount(0);
  };

  const handleOpenReject = (projectId: string) => {
    setRejectingProjectId(projectId);
    setRejectReason("");
  };

  const handleCancelReject = () => {
    setRejectingProjectId(null);
    setRejectReason("");
  };

  const handleConfirmReject = async (projectId: string) => {
    if (!rejectReason.trim()) {
      showToast("Ingresa el motivo del rechazo.", "warning");
      return;
    }
    setIsRejecting(true);
    try {
      await onRejectProposals(projectId, rejectReason.trim());
      setRejectingProjectId(null);
      setRejectReason("");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* SECTION 1: Pending Investment Approvals */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-6">
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl border border-purple-100">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-base">Gerencia de Procura: Autorización de Inversión Inicial</h3>
            <p className="text-xs text-slate-500 font-medium">Autorice el envío de expedientes de obra para la ronda de licitación. Fije los límites presupuestarios según las cubicaciones corregidas.</p>
          </div>
        </div>

        {pendingInvestmentApproval.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-medium italic">
            No hay nuevas peticiones aprobadas por Cierre de Obra esperando tope presupuestario.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peticiones Listas para Procura:</label>
              <div className="flex flex-wrap gap-2 max-h-88 overflow-y-auto pr-2 -mr-2 scrollbar-smooth">
                {pendingInvestmentApproval.map((p) => (
                  <button
                    id={`procura-review-select-${p.id}`}
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedReviewId(p.id);
                      setApprovedAmount(p.estimatedTotal);
                      setProcuraNotes(`Presupuesto aprobado de $${p.estimatedTotal} para licitación directa. Cierre de Obra validó planos correspondientes.`);
                    }}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      selectedReviewId === p.id
                        ? "border-purple-500 bg-purple-50 text-purple-950 ring-2 ring-purple-100"
                        : "border-slate-200 bg-white hover:border-purple-400 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="font-mono text-[9px] text-purple-600 font-bold mb-0.5">{p.id}</div>
                    <div>{p.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {activeReviewProject && (
              <form onSubmit={handleApproveInvestment} className="border-t border-slate-100 pt-5 space-y-5">
                <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-100 font-medium">
                  <div className="flex justify-between items-center text-slate-800">
                    <strong className="font-bold text-slate-400">Estimado de Materiales (Cierre Obra):</strong>
                    <span className="font-mono font-bold text-slate-900">${activeProjectEstimates(activeReviewProject)}</span>
                  </div>
                  <div><strong className="font-bold text-slate-400">Ubicación: </strong> {activeReviewProject.location}</div>
                  <div className="text-slate-500 italic mt-1.5 leading-relaxed pt-2 border-t border-slate-200/60">
                    <strong className="font-bold text-slate-600">Nota Cierre de Obra: </strong> {activeReviewProject.cierreObraNotes}
                  </div>
                </div>

                {/* Documents: planos y hojas de cálculo */}
                {(() => {
                  const docs = activeReviewProject.documents ?? [];
                  const planos = docs.filter(d => d.documentType === "PLANO");
                  const calcs = docs.filter(d => d.documentType === "CALC");
                  if (docs.length === 0) return null;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Map className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                            Planos de Ingeniería ({planos.length})
                          </span>
                        </div>
                        {planos.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic font-medium">Sin planos adjuntos.</p>
                        ) : (
                          <ul className="space-y-1">
                            {planos.map(doc => (
                              <li key={doc.id} className="flex items-center justify-between gap-2 bg-white border border-indigo-100 rounded-lg px-2.5 py-1.5">
                                <span className="text-[11px] font-bold text-indigo-800 truncate" title={doc.originalName}>{doc.originalName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(activeReviewProject.id, doc)}
                                  className="shrink-0 text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
                                  title="Descargar"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider">
                            Hojas de Cálculo ({calcs.length})
                          </span>
                        </div>
                        {calcs.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic font-medium">Sin hojas de cálculo adjuntas.</p>
                        ) : (
                          <ul className="space-y-1">
                            {calcs.map(doc => (
                              <li key={doc.id} className="flex items-center justify-between gap-2 bg-white border border-sky-100 rounded-lg px-2.5 py-1.5">
                                <span className="text-[11px] font-bold text-sky-800 truncate" title={doc.originalName}>{doc.originalName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(activeReviewProject.id, doc)}
                                  className="shrink-0 text-sky-400 hover:text-sky-700 transition-colors cursor-pointer"
                                  title="Descargar"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Inversión Aprobada Autorizada ($)</label>
                    <input
                      id="procura-approved-amount"
                      type="number"
                      step="0.01"
                      value={approvedAmount}
                      onChange={(e) => { const v = e.target.value.replace(/[eE]/g, ''); setApprovedAmount(v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                      onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === 'Subtract') e.preventDefault(); }}
                      onPaste={(e) => { e.preventDefault(); const v = e.clipboardData.getData('text/plain').replace(/[eE]/g, ''); setApprovedAmount(v === "" ? "" : Math.max(0, parseFloat(v) || 0)); }}
                      placeholder="0.00"
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500 bg-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas de Aprobación de Presupuesto</label>
                    <input
                      id="procura-notes"
                      type="text"
                      placeholder="Ej. Proyecto urgente de climatización, habilitar licitaciones prioritarias."
                      value={procuraNotes}
                      onChange={(e) => setProcuraNotes(e.target.value)}
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn-procura-approve-investment"
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-600/10 transition-all cursor-pointer transform hover:scale-[1.02]"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Autorizar Presupuesto y Enviar a Licitación
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Bid Evaluation & Final Hiring Decision */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-300 grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 -mr-2 scroll-smooth">
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5 mb-6">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-base">Evaluación Comparativa de Ofertas y Contratación</h3>
            <p className="text-xs text-slate-500 font-medium">Examine el cuadro comparativo estructurado por los Analistas. Seleccione el contratista idóneo considerando precio, plazo y condiciones de anticipo.</p>
          </div>
        </div>

        {pendingContractSelection.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 italic font-medium">No hay propuestas ni cuadros comparativos pendientes por revisión de contratación en este momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingContractSelection.map((p) => {
              const isRejectingThis = rejectingProjectId === p.id;
              return (
                <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50/10 p-5 space-y-4 ">

                  {/* Project Brief */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 pb-4 gap-3">
                    <div>
                      <span className="text-[9px] font-mono font-bold bg-sky-50 text-sky-800 px-2.5 py-0.5 rounded-lg border border-sky-100">
                        {p.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">{p.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {p.location} • Inversión Autorizada:{" "}
                        <span className="font-mono text-slate-700 font-bold">${p.approvedInvestmentAmount?.toLocaleString("en-US")}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sky-600 font-bold bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 font-mono text-[10px] tracking-wider uppercase">
                        Comparativa Lista ({p.proposals?.length || 0} Propuestas)
                      </span>
                      <button
                        id={`btn-ai-eval-${p.id}`}
                        onClick={() => setAiEvalProject(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        Evaluación Inteligente
                      </button>
                      {!isRejectingThis && (
                        <button
                          onClick={() => handleOpenReject(p.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rejection form (inline) */}
                  {isRejectingThis && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-black">Rechazar cuadro comparativo</span>
                      </div>
                      <p className="text-xs text-red-600/80 font-medium">
                        Se eliminarán todas las propuestas cargadas y el proyecto regresará a <strong>Carga de Propuestas de Contratistas</strong> para que los Analistas inicien una nueva ronda.
                      </p>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-red-600">
                          Motivo del rechazo *
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          placeholder="Ej. Los precios presentados superan el presupuesto autorizado. Se requiere nueva ronda de licitación."
                          className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelReject}
                          disabled={isRejecting}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmReject(p.id)}
                          disabled={isRejecting || !rejectReason.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {isRejecting ? "Rechazando..." : "Confirmar rechazo"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Proposals Spreadsheet Comparer */}
                  {!isRejectingThis && (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                            <th className="py-3 px-4">Contratista (Código)</th>
                            <th className="py-3 px-3 text-right">Insumos/Materiales</th>
                            <th className="py-3 px-3 text-right">Mano de Obra</th>
                            <th className="py-3 px-3 text-right text-sky-700 font-black">Costo Total</th>
                            <th className="py-3 px-3 text-center">Entrega</th>
                            <th className="py-3 px-3 text-center">Anticipo Pactado</th>
                            <th className="py-3 px-4 text-center">Contratación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {p.proposals?.map((prop) => (
                            <tr key={prop.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="font-bold text-slate-800 text-[12px]">{prop.contractorName}</div>
                                <div className="font-mono text-[9px] text-sky-600 font-bold mt-0.5">Código: {prop.contractorCode}</div>
                                <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate font-medium" title={prop.description}>
                                  {prop.description}
                                </div>
                              </td>
                              <td className="py-4 px-3 text-right font-mono font-medium text-slate-600">${prop.materialCost.toLocaleString("en-US")}</td>
                              <td className="py-4 px-3 text-right font-mono font-medium text-slate-600">${prop.laborCost.toLocaleString("en-US")}</td>
                              <td className="py-4 px-3 text-right font-mono font-black text-slate-900 text-sm">${prop.totalCost.toLocaleString("en-US")}</td>
                              <td className="py-4 px-3 text-center text-slate-600 font-semibold">{prop.deliveryWeeks} semanas</td>
                              <td className="py-4 px-3 text-center font-mono">
                                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-emerald-200">
                                  {prop.negotiatedAdvancePercent}%
                                </span>
                                <div className="text-[9px] text-slate-400 mt-1 font-semibold">
                                  (${(prop.totalCost * (prop.negotiatedAdvancePercent / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })})
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  id={`btn-hire-${p.id}-${prop.contractorCode}`}
                                  onClick={() => onSelectContractor(p.id, prop.contractorCode, prop.id)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/10 transition-colors cursor-pointer"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Adjudicar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Evaluation Modal */}
      {aiEvalProject && (
        <EvaluacionInteligenteModal
          isOpen={!!aiEvalProject}
          onClose={() => setAiEvalProject(null)}
          project={aiEvalProject}
          proposals={aiEvalProject.proposals ?? []}
          onSelectContractor={onSelectContractor}
          authToken={authToken}
        />
      )}

    </div>
  );
}

/* ─── Skeleton Loader ─── */
function ProcuraSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard />
      <SkeletonTable rows={3} columns={7} />
    </div>
  );
}

// Helper
function activeProjectEstimates(p: Project) {
  return p.estimatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 });
}
