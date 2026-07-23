/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Procura: aprobación de inversión inicial + evaluación comparativa.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Project, ProjectStatus, ProjectDocument } from "../types";
import { useToast } from "../components/UI/Toast";
import {
  Users,
  TrendingUp,
  CheckSquare,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Map,
  MapPin,
  Download,
  BrainCircuit,
} from "lucide-react";
import EvaluacionInteligenteModal from "../components/Modals/EvaluacionInteligenteModal";
import { SkeletonCard, SkeletonTable } from "../components/SkeletonLoader";
import { apiDownload } from "../services/api";
import Card from "../components/UI/Card";
import SectionHeader from "../components/UI/SectionHeader";
import NumericInput from "../components/UI/NumericInput";
import EmptyState from "../components/UI/EmptyState";
import ConfirmDialog from "../components/UI/ConfirmDialog";
import { Table, type Column } from "../components/UI/Table";
import { formatNumber } from "../utils";
import { containerVariants, itemVariants } from "../animations";

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
  // Phase 1 form state
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [procuraNotes, setProcuraNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");

  // Rejection state
  const [rejectingProjectId, setRejectingProjectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Confirm contractor selection
  const [confirmSelect, setConfirmSelect] = useState<{ projectId: string; contractorCode: string; proposalId: string; contractorName: string } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // AI Evaluation modal state
  const [aiEvalProject, setAiEvalProject] = useState<Project | null>(null);

  const pendingInvestmentApproval = projects.filter(p => p.status === ProjectStatus.REVISADO_CIERRE);
  const pendingContractSelection = projects.filter(p => p.status === ProjectStatus.COMPARATIVA_ENVIADA);
  const activeReviewProject = pendingInvestmentApproval.find(p => p.id === selectedReviewId);

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

  const handleApproveInvestmentSubmit = (e: React.FormEvent) => {
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

  /** Renderiza documentos adjuntos (planos + hojas de cálculo) */
  const renderDocuments = (project: Project) => {
    const docs = project.documents ?? [];
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
                    onClick={() => handleDownload(project.id, doc)}
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
                    onClick={() => handleDownload(project.id, doc)}
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
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* SECTION 1: Pending Investment Approvals */}
      <motion.div variants={itemVariants}>
      <Card className="border-l-4 border-l-purple-400">
        <SectionHeader
          icon={<TrendingUp className="h-5 w-5" />}
          title="Gerencia de Procura: Autorización de Inversión Inicial"
          description="Autorice el envío de expedientes de obra para la ronda de licitación. Fije los límites presupuestarios según las cubicaciones corregidas."
          color="purple"
        />

        {pendingInvestmentApproval.length === 0 ? (
          <EmptyState message="No hay nuevas peticiones aprobadas por Cierre de Obra esperando tope presupuestario." />
        ) : (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peticiones Listas para Procura:</label>
              <div
                className="flex flex-wrap gap-2 max-h-88 overflow-y-auto pr-2 -mr-2 scroll-smooth"
                style={{ willChange: "scroll-position" }}
              >
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
                    style={{ contentVisibility: "auto", contain: "layout style paint" }}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                      selectedReviewId === p.id
                        ? "border-purple-500 bg-gradient-to-br from-purple-50 to-white text-purple-950 ring-2 ring-purple-100 shadow-sm"
                        : "border-slate-200 bg-white hover:border-purple-400 hover:bg-slate-50/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="font-mono text-[9px] text-purple-600 font-bold mb-0.5">{p.id}</div>
                    <div className="line-clamp-1">{p.title}</div>
                    <div className="text-[9px] text-slate-400 font-medium mt-1">{p.location}</div>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {activeReviewProject && (
                <motion.form
                  key="review-form"
                  onSubmit={handleApproveInvestmentSubmit}
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="border-t border-slate-100 pt-5 space-y-5 overflow-hidden"
                >
                <div className="p-4 bg-gradient-to-br from-purple-50/40 to-white rounded-xl text-xs space-y-2 border border-purple-100/60 font-medium">
                  <div className="flex justify-between items-center">
                    <strong className="font-bold text-slate-400">Estimado de Materiales (Cierre Obra):</strong>
                    <span className="font-mono font-bold text-purple-700">${formatNumber(activeReviewProject.estimatedTotal)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {activeReviewProject.location}
                  </div>
                  <div className="text-slate-500 italic leading-relaxed pt-2 border-t border-purple-100/60">
                    <span className="font-bold not-italic text-slate-600">Nota Cierre de Obra: </span>
                    {activeReviewProject.cierreObraNotes}
                  </div>
                </div>

                {renderDocuments(activeReviewProject)}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Inversión Aprobada Autorizada ($)
                    </label>
                    <NumericInput
                      id="procura-approved-amount"
                      value={approvedAmount}
                      onChange={setApprovedAmount}
                      placeholder="0.00"
                      className="focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Notas de Aprobación de Presupuesto
                    </label>
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
                    className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-md shadow-purple-600/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-purple-600/30 hover:-translate-y-0.5"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Autorizar Presupuesto y Enviar a Licitación
                  </button>
                </div>
              </motion.form>
            )}
            </AnimatePresence>
          </div>
        )}
      </Card>
      </motion.div>

      {/* SECTION 2: Bid Evaluation & Final Hiring Decision */}
      <motion.div variants={itemVariants}>
      <Card className="border-l-4 border-l-emerald-400">
        <SectionHeader
          icon={<Users className="h-5 w-5" />}
          title="Evaluación Comparativa de Ofertas y Contratación"
          description="Examine el cuadro comparativo estructurado por los Analistas. Seleccione el contratista idóneo considerando precio, plazo y condiciones de anticipo."
          color="emerald"
        />

        {pendingContractSelection.length === 0 ? (
          <EmptyState message="No hay propuestas ni cuadros comparativos pendientes por revisión de contratación en este momento." />
        ) : (
          <div
            className="space-y-6 max-h-[580px] overflow-y-auto pr-1"
            style={{ willChange: "scroll-position" }}
          >
            {pendingContractSelection.map((p) => {
              const isRejectingThis = rejectingProjectId === p.id;
              return (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white p-5 space-y-4"
                  style={{ contentVisibility: "auto", contain: "layout style paint" }}
                >

                  {/* Project Brief */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 pb-4 gap-3">
                    <div>
                      <span className="text-[9px] font-mono font-bold bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {p.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">{p.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {p.location} &bull; Inversión Autorizada:{" "}
                        <span className="font-mono text-slate-700 font-bold">${p.approvedInvestmentAmount?.toLocaleString("en-US")}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-mono text-[10px] tracking-wider uppercase shadow-xs">
                        {p.proposals?.length || 0} Propuestas
                      </span>
                      <button
                        id={`btn-ai-eval-${p.id}`}
                        onClick={() => setAiEvalProject(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-sm"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        Evaluación IA
                      </button>
                      {!isRejectingThis && (
                        <button
                          onClick={() => handleOpenReject(p.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-sm"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rejection form (inline) */}
                  <AnimatePresence>
                    {isRejectingThis && (
                      <motion.div
                        key="reject-form"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                      <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 space-y-3 shadow-sm">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-black">Rechazar cuadro comparativo</span>
                      </div>
                      <p className="text-xs text-red-600/80 font-medium leading-relaxed">
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
                          maxLength={500}
                          placeholder="Ej. Los precios presentados superan el presupuesto autorizado. Se requiere nueva ronda de licitación."
                          className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                        />
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{rejectReason.length}/500</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelReject}
                          disabled={isRejecting}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmReject(p.id)}
                          disabled={isRejecting || !rejectReason.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-xl shadow-md shadow-red-600/20 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {isRejecting ? "Rechazando..." : "Confirmar rechazo"}
                        </button>
                      </div>
                    </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Proposals Spreadsheet Comparer */}
                  {!isRejectingThis && (
                    <div className="border border-slate-100 rounded-xl bg-white overflow-hidden shadow-xs">
                      <Table
                        columns={[
                          {
                            key: "contractor",
                            label: "Contratista (Código)",
                            render: (prop) => (
                              <>
                                <div className="font-bold text-slate-800 text-[12px]">{prop.contractorName}</div>
                                <div className="font-mono text-[9px] text-emerald-600 font-bold mt-0.5">Código: {prop.contractorCode}</div>
                                <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate font-medium" title={prop.description}>{prop.description}</div>
                              </>
                            ),
                          },
                          { key: "materialCost", label: "Insumos/Materiales", align: "right", render: (prop) => <span className="font-mono font-medium text-slate-600">${prop.materialCost.toLocaleString("en-US")}</span> },
                          { key: "laborCost", label: "Mano de Obra", align: "right", render: (prop) => <span className="font-mono font-medium text-slate-600">${prop.laborCost.toLocaleString("en-US")}</span> },
                          { key: "totalCost", label: "Costo Total", align: "right", render: (prop) => <span className="font-mono font-black text-emerald-700 text-sm">${prop.totalCost.toLocaleString("en-US")}</span> },
                          { key: "deliveryWeeks", label: "Entrega", align: "center", render: (prop) => <span className="text-slate-600 font-semibold">{prop.deliveryWeeks} semanas</span> },
                          {
                            key: "advance",
                            label: "Anticipo Pactado",
                            align: "center",
                            render: (prop) => (
                              <>
                                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-emerald-200">{prop.negotiatedAdvancePercent}%</span>
                                <div className="text-[9px] text-slate-400 mt-1 font-semibold">(${(prop.totalCost * (prop.negotiatedAdvancePercent / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })})</div>
                              </>
                            ),
                          },
                          {
                            key: "actions",
                            label: "Contratación",
                            align: "center",
                            render: (prop) => (
                              <button
                                id={`btn-hire-${p.id}-${prop.contractorCode}`}
                                onClick={() => setConfirmSelect({
                                  projectId: p.id,
                                  contractorCode: prop.contractorCode,
                                  proposalId: prop.id,
                                  contractorName: prop.contractorName,
                                })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 rounded-xl shadow-md shadow-sky-500/20 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                Adjudicar
                              </button>
                            ),
                          },
                        ]}
                        data={p.proposals ?? []}
                        rowKey={(prop) => prop.id}
                      />
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </Card>
      </motion.div>

      {/* ── Confirm Contractor Selection ── */}
      <ConfirmDialog
        isOpen={!!confirmSelect}
        onClose={() => setConfirmSelect(null)}
        onConfirm={async () => {
          if (!confirmSelect) return;
          setIsSelecting(true);
          try {
            await onSelectContractor(confirmSelect.projectId, confirmSelect.contractorCode, confirmSelect.proposalId);
            setConfirmSelect(null);
          } finally {
            setIsSelecting(false);
          }
        }}
        title="Adjudicar Contratista"
        message={`¿Estás seguro de adjudicar el contrato a "${confirmSelect?.contractorName ?? ""}"? Esta acción seleccionará a este contratista como ganador y enviará el proyecto a Finanzas para liberación del anticipo.`}
        variant="warning"
        confirmLabel="Confirmar adjudicación"
        isLoading={isSelecting}
      />

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

    </motion.div>
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
