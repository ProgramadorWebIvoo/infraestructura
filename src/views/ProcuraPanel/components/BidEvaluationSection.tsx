/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Procura: evaluación comparativa de ofertas y contratación —
 * extraída de ProcuraPanel.
 */

import { useMemo, useState } from "react";
import Button from "../../../components/UI/Button";
import { AlertTriangle, BrainCircuit, Clock, Gauge, MapPin, ShieldCheck, Star, Trophy, Users, Wallet, XCircle } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import { Table } from "../../../components/UI/Table";
import EvaluacionInteligenteModal from "../../../components/Modals/EvaluacionInteligenteModal";
import HireConfirmDialog from "../../../components/Modals/HireConfirmDialog";
import { useBudgetSemaphore, SEMAPHORE_COLORS } from "../../../hooks/useBudgetSemaphore";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { ProjectStatus } from "../../../types";
import type { Project, Proposal } from "../../../types";

interface BidEvaluationSectionProps {
  projects: Project[];
  authToken: string;
  onSelectContractor: (projectId: string, contractorCode: string, proposalId: string) => Promise<void>;
  onRejectProposals: (projectId: string, reason: string) => void;
}

/** Resumen comparativo de las propuestas de un proyecto */
function ProposalSummary({ project }: { project: Project }) {
  const proposals = project.proposals ?? [];
  if (proposals.length === 0) return null;

  const best = proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]);
  const authorized = project.approvedInvestmentAmount ?? 0;
  const savings = authorized - best.totalCost;
  const weeks = proposals.map(p => p.deliveryWeeks || 0);
  const minWeeks = Math.min(...weeks);
  const maxWeeks = Math.max(...weeks);
  const avgRating = proposals.reduce((s, p) => s + (p.contractorRating ?? 0), 0) / proposals.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
        <div className="flex items-center gap-1.5 text-emerald-600 text-[9px] font-black uppercase tracking-wider">
          <Trophy className="h-3 w-3" /> Mejor Oferta
        </div>
        <div className="mt-1 font-mono font-black text-emerald-700 text-sm">${best.totalCost.toLocaleString("en-US")}</div>
        <div className="text-[10px] text-slate-500 font-medium truncate" title={best.contractorName}>{best.contractorName}</div>
      </div>

      <div className={`rounded-xl border p-3 ${savings >= 0 ? "border-sky-100 bg-sky-50/40" : "border-rose-100 bg-rose-50/40"}`}>
        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${savings >= 0 ? "text-sky-600" : "text-rose-600"}`}>
          <Wallet className="h-3 w-3" /> {savings >= 0 ? "Ahorro" : "Sobre Presupuesto"}
        </div>
        <div className={`mt-1 font-mono font-black text-sm ${savings >= 0 ? "text-sky-700" : "text-rose-700"}`}>
          ${Math.abs(savings).toLocaleString("en-US")}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">vs ${authorized.toLocaleString("en-US")} autorizado</div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
        <div className="flex items-center gap-1.5 text-indigo-600 text-[9px] font-black uppercase tracking-wider">
          <Clock className="h-3 w-3" /> Entrega
        </div>
        <div className="mt-1 font-mono font-black text-indigo-700 text-sm">
          {minWeeks > 0 ? `${minWeeks}–${maxWeeks}` : "—"}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">semanas estimadas</div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
        <div className="flex items-center gap-1.5 text-amber-600 text-[9px] font-black uppercase tracking-wider">
          <Star className="h-3 w-3" /> Rating Promedio
        </div>
        <div className="mt-1 font-mono font-black text-amber-700 text-sm">
          {avgRating > 0 ? avgRating.toFixed(1) : "—"}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">de {proposals.length} postores</div>
      </div>
    </div>
  );
}

export default function BidEvaluationSection({
  projects,
  authToken,
  onSelectContractor,
  onRejectProposals,
}: BidEvaluationSectionProps) {
  const { levelOf } = useBudgetSemaphore();
  const maxAdvancePercent = useMaxAdvancePercent();

  const [rejectingProject, setRejectingProject] = useState<Project | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [confirmSelect, setConfirmSelect] = useState<{
    projectId: string;
    contractorCode: string;
    proposalId: string;
    contractorName: string;
    advancePercent: number;
    executedPct: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const [aiEvalProject, setAiEvalProject] = useState<Project | null>(null);

  const pendingContractSelection = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.COMPARATIVA_ENVIADA),
    [projects],
  );

  const handleOpenReject = (p: Project) => {
    setRejectingProject(p);
    setRejectReason("");
  };

  const handleCancelReject = () => {
    setRejectingProject(null);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingProject || !rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await onRejectProposals(rejectingProject.id, rejectReason.trim());
      setRejectingProject(null);
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
          actions={
            pendingContractSelection.length > 0 ? (
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                {pendingContractSelection.length} cuadro{pendingContractSelection.length !== 1 ? "s" : ""} por adjudicar
              </span>
            ) : undefined
          }
        />

        {pendingContractSelection.length === 0 ? (
          <EmptyState message="No hay propuestas ni cuadros comparativos pendientes por revisión de contratación en este momento." />
        ) : (
          <div
            className="space-y-6 max-h-[580px] overflow-y-auto pr-1 pb-2 scroll-smooth scroll-pb-2"
          >
            {pendingContractSelection.map((p) => {
              const proposals = p.proposals ?? [];
              const best = proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]);
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
                        {proposals.length} Propuestas
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
                      <Button
                        onClick={() => handleOpenReject(p)}
                        variant="secondary"
                        size="sm"
                        className="text-red-600 bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300"
                        icon={<XCircle className="h-3.5 w-3.5" />}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>

                  {/* Resumen comparativo */}
                  <ProposalSummary project={p} />

                  {/* Proposals Spreadsheet Comparer */}
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
                        {
                          key: "totalCost",
                          label: "Costo Total",
                          align: "right",
                          render: (prop) => (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`font-mono font-black text-sm ${prop.id === best?.id ? "text-emerald-700" : "text-slate-700"}`}>
                                ${prop.totalCost.toLocaleString("en-US")}
                              </span>
                              {prop.id === best?.id && (
                                <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  Mejor
                                </span>
                              )}
                            </div>
                          ),
                        },
                        {
                          key: "semaphore",
                          label: "Semáforo",
                          align: "center",
                          render: (prop) => {
                            const authorized = p.approvedInvestmentAmount ?? 0;
                            const pct = authorized > 0 ? (prop.totalCost / authorized) * 100 : 0;
                            const colors = SEMAPHORE_COLORS[levelOf(pct)];
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] border ${colors.text} ${colors.bg}`}>
                                <Gauge className="h-3 w-3" />
                                {Math.round(pct)}%
                              </span>
                            );
                          },
                        },
                        { key: "deliveryWeeks", label: "Entrega", align: "center", render: (prop) => <span className="text-slate-600 font-semibold">{prop.deliveryWeeks > 0 ? `${prop.deliveryWeeks} semanas` : "Sin dato"}</span> },
                        {
                          key: "advance",
                          label: "Anticipo Pactado",
                          align: "center",
                          render: (prop) => {
                            const exceedsMax = prop.negotiatedAdvancePercent > maxAdvancePercent;
                            return (
                              <>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                                    exceedsMax
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                                >
                                  {exceedsMax && <AlertTriangle className="h-3 w-3" />}
                                  {prop.negotiatedAdvancePercent}%
                                </span>
                                <div className="text-[9px] text-slate-400 mt-1 font-semibold">(${(prop.totalCost * (prop.negotiatedAdvancePercent / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })})</div>
                                {exceedsMax && (
                                  <div className="text-[8px] text-amber-600 font-bold mt-0.5">Supera máx. {maxAdvancePercent}%</div>
                                )}
                              </>
                            );
                          },
                        },
                        {
                          key: "actions",
                          label: "Contratación",
                          align: "center",
                          render: (prop) => {
                            const authorized = p.approvedInvestmentAmount ?? 0;
                            const executedPct = authorized > 0 ? (prop.totalCost / authorized) * 100 : 0;
                            return (
                              <Button
                                id={`btn-hire-${p.id}-${prop.contractorCode}`}
                                onClick={() => setConfirmSelect({
                                  projectId: p.id,
                                  contractorCode: prop.contractorCode,
                                  proposalId: prop.id,
                                  contractorName: prop.contractorName,
                                  advancePercent: prop.negotiatedAdvancePercent,
                                  executedPct,
                                })}
                                variant="primary"
                                colorScheme="sky"
                                size="sm"
                                icon={<ShieldCheck className="h-4 w-4" />}
                              >
                                Adjudicar
                              </Button>
                            );
                          },
                        },
                      ]}
                      data={proposals}
                      rowKey={(prop) => prop.id}
                      selectedRowKey={best?.id}
                      selectedRowClass="bg-emerald-50/60 ring-1 ring-emerald-200"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Modal de rechazo ── */}
      <Modal
        isOpen={!!rejectingProject}
        onClose={handleCancelReject}
        maxWidth="max-w-md"
        icon={<AlertTriangle className="h-5 w-5" />}
        iconColor="rose"
        badge="Rechazo de cuadro"
        title={rejectingProject ? `Rechazar ${rejectingProject.id}` : ""}
        infoLine={rejectingProject ? rejectingProject.title : ""}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={handleCancelReject} disabled={isRejecting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              colorScheme="rose"
              onClick={handleConfirmReject}
              disabled={isRejecting || !rejectReason.trim()}
              isLoading={isRejecting}
              icon={<XCircle className="h-3.5 w-3.5" />}
            >
              {isRejecting ? "Rechazando..." : "Confirmar rechazo"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
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
              rows={3}
              maxLength={500}
              placeholder="Ej. Los precios presentados superan el presupuesto autorizado. Se requiere nueva ronda de licitación."
              className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
            />
            <span className="text-[9px] text-slate-400 font-mono mt-1 block text-right">{rejectReason.length}/500</span>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Contractor Selection ── */}
      <HireConfirmDialog
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
        isLoading={isSelecting}
        contractorName={confirmSelect?.contractorName ?? ""}
        advancePercent={confirmSelect?.advancePercent ?? 0}
        maxAdvancePercent={maxAdvancePercent}
        executedPct={confirmSelect?.executedPct ?? 0}
        semaphoreLevel={levelOf(confirmSelect?.executedPct ?? 0)}
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