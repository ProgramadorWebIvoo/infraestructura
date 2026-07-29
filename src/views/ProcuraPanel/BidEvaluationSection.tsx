/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Procura: evaluación comparativa de ofertas y contratación —
 * extraída de ProcuraPanel.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Button from "../../components/UI/Button";
import { AlertTriangle, BrainCircuit, MapPin, ShieldCheck, Users, XCircle } from "lucide-react";
import Card from "../../components/UI/Card";
import SectionHeader from "../../components/UI/SectionHeader";
import EmptyState from "../../components/UI/EmptyState";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import { Table } from "../../components/UI/Table";
import EvaluacionInteligenteModal from "../../components/Modals/EvaluacionInteligenteModal";
import { ProjectStatus } from "../../types";
import type { Project } from "../../types";

interface BidEvaluationSectionProps {
  projects: Project[];
  authToken: string;
  onSelectContractor: (projectId: string, contractorCode: string, proposalId: string) => Promise<void>;
  onRejectProposals: (projectId: string, reason: string) => void;
}

export default function BidEvaluationSection({
  projects,
  authToken,
  onSelectContractor,
  onRejectProposals,
}: BidEvaluationSectionProps) {
  const [rejectingProjectId, setRejectingProjectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [confirmSelect, setConfirmSelect] = useState<{ projectId: string; contractorCode: string; proposalId: string; contractorName: string } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const [aiEvalProject, setAiEvalProject] = useState<Project | null>(null);

  const pendingContractSelection = projects.filter(p => p.status === ProjectStatus.COMPARATIVA_ENVIADA);

  const handleOpenReject = (projectId: string) => {
    setRejectingProjectId(projectId);
    setRejectReason("");
  };

  const handleCancelReject = () => {
    setRejectingProjectId(null);
    setRejectReason("");
  };

  const handleConfirmReject = async (projectId: string) => {
    if (!rejectReason.trim()) return;
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
    <>
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
                      <Button
                        id={`btn-ai-eval-${p.id}`}
                        onClick={() => setAiEvalProject(p)}
                        variant="secondary"
                        size="sm"
                        className="text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300"
                        icon={<BrainCircuit className="h-3.5 w-3.5" />}
                      >
                        Evaluación IA
                      </Button>
                      {!isRejectingThis && (
                        <Button
                          onClick={() => handleOpenReject(p.id)}
                          variant="secondary"
                          size="sm"
                          className="text-red-600 bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300"
                          icon={<XCircle className="h-3.5 w-3.5" />}
                        >
                          Rechazar
                        </Button>
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
                        <Button
                          variant="secondary"
                          onClick={handleCancelReject}
                          disabled={isRejecting}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="primary"
                          colorScheme="rose"
                          onClick={() => handleConfirmReject(p.id)}
                          disabled={isRejecting || !rejectReason.trim()}
                          isLoading={isRejecting}
                          icon={<XCircle className="h-3.5 w-3.5" />}
                        >
                          {isRejecting ? "Rechazando..." : "Confirmar rechazo"}
                        </Button>
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
                          { key: "deliveryWeeks", label: "Entrega", align: "center", render: (prop) => <span className="text-slate-600 font-semibold">{prop.deliveryWeeks > 0 ? `${prop.deliveryWeeks} semanas` : "Sin dato"}</span> },
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
                              <Button
                                id={`btn-hire-${p.id}-${prop.contractorCode}`}
                                onClick={() => setConfirmSelect({
                                  projectId: p.id,
                                  contractorCode: prop.contractorCode,
                                  proposalId: prop.id,
                                  contractorName: prop.contractorName,
                                })}
                                variant="primary"
                                colorScheme="sky"
                                size="sm"
                                icon={<ShieldCheck className="h-4 w-4" />}
                              >
                                Adjudicar
                              </Button>
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
    </>
  );
}
