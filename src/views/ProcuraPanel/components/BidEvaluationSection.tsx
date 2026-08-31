/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 2 de Procura: evaluación comparativa de ofertas y contratación —
 * extraída de ProcuraPanel.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Button from "../../../components/UI/Button";
import { AlertTriangle, BrainCircuit, Eye, Gauge, SearchX, ShieldCheck, Trophy, Users, XCircle } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import TableToolbar from "../../../components/UI/TableToolbar";
import Tooltip from "@/components/UI/Tooltip";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import { RequiredMark } from "../../../components/UI/HintSignals";
import ProposalSummary from "../../../components/ProposalSummary";
import { renderBidEvaluationCard } from "./BidEvaluationGridCard";
import EvaluacionInteligenteModal from "../../../components/Modals/EvaluacionInteligenteModal";
import HireConfirmDialog from "../../../components/Modals/HireConfirmDialog";
import InspectProposalModal from "./InspectProposalModal";
import { useBudgetSemaphore, SEMAPHORE_COLORS, type SemaphoreLevel } from "../../../hooks/useBudgetSemaphore";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useTableViewMode } from "../../../hooks/useTableViewMode";
import { viewSwitchVariants } from "../../../animations";
import { formatCurrency } from "../../../utils";
import { ProjectStatus } from "../../../types";
import type { Project, Proposal } from "../../../types";
import { formatProposalDuration } from "../../AnalistasPanel/components/RegisterProposalModal";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";
import BsAmount from "../../../components/UI/BsAmount";

interface BidEvaluationSectionProps {
  projects: Project[];
  authToken: string;
  onSelectContractor: (projectId: string, contractorCode: string, proposalId: string) => Promise<void>;
  onRejectProposals: (projectId: string, reason: string) => void;
}

/** Cuadro comparativo completo de un expediente — resumen + tabla, en un modal grande. */
function BidEvaluationDetail({
  project,
  onClose,
  onOpenAiEval,
  onOpenReject,
  onHire,
  onInspect,
  levelOf,
  maxAdvancePercent,
  convert,
  hasRates,
  isLoadingRates,
}: {
  project: Project;
  onClose: () => void;
  onOpenAiEval: () => void;
  onOpenReject: () => void;
  onHire: (args: { projectId: string; contractorCode: string; proposalId: string; contractorName: string; advancePercent: number; executedPct: number }) => void;
  onInspect: (proposal: Proposal) => void;
  levelOf: (pct: number) => SemaphoreLevel;
  maxAdvancePercent: number;
  convert: (amount: number, fromCode: string) => number;
  hasRates: boolean;
  isLoadingRates: boolean;
}) {
  const proposals = project.proposals ?? [];
  const best = proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="max-w-6xl"
      icon={<Users className="h-5 w-5" />}
      iconColor="emerald"
      badge="Evaluación Comparativa"
      title={`Expediente ${project.id}`}
      infoLine={`${project.title} · ${project.location}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
            Seleccione el contratista idóneo desde la columna "Contratación" de la tabla.
          </span>
          <div className="flex items-center gap-2">
            <Button
              id={`btn-ai-eval-${project.id}`}
              onClick={onOpenAiEval}
              variant="secondary"
              size="sm"
              className="text-warning-600 bg-warning-50 hover:bg-warning-100 border-warning-200 hover:border-warning-300"
              icon={<BrainCircuit className="h-3.5 w-3.5" />}
            >
              Evaluación IA
            </Button>
            <Button
              onClick={onOpenReject}
              variant="secondary"
              size="sm"
              className="text-danger-600 bg-danger-50 hover:bg-danger-100 border-danger-200 hover:border-danger-300"
              icon={<XCircle className="h-3.5 w-3.5" />}
            >
              Rechazar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Inversión Autorizada</span>
          <span className="font-mono text-slate-700 font-black">{formatCurrency(project.approvedInvestmentAmount ?? 0)}</span>
          {hasRates && (
            <span className="font-mono text-slate-400 text-[10px]">
              (Bs. {formatBs(convert(project.approvedInvestmentAmount ?? 0, "USD"))})
            </span>
          )}
        </div>

        {/* Resumen comparativo */}
        <ProposalSummary project={project} />

        {/* Cuadro comparativo de propuestas */}
        <div className="border border-slate-100 rounded-xl bg-white overflow-hidden shadow-xs">
          <Table
            columns={[
              {
                key: "contractor",
                label: "Contratista (Código)",
                width: "13rem",
                render: (prop) => (
                  <div className="flex items-center gap-2">
                    {prop.id === best?.id && (
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-success-100 text-success-600" aria-hidden="true">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-[12px] truncate">{prop.contractorName}</div>
                      <div className="font-mono text-[9px] text-success-600 font-bold mt-0.5">Código: {prop.contractorCode}</div>
                      <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate font-medium" title={prop.description}>{prop.description}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: "materialCost",
                label: "Materiales",
                width: "7.5rem",
                align: "right",
                render: (prop) => (
                  <div>
                    <span className="font-mono font-medium text-slate-600 block">{formatCurrency(prop.materialCost)}</span>
                    <BsAmount amount={prop.materialCost} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                  </div>
                ),
              },
              {
                key: "laborCost",
                label: "Mano de Obra",
                width: "7.5rem",
                align: "right",
                render: (prop) => (
                  <div>
                    <span className="font-mono font-medium text-slate-600 block">{formatCurrency(prop.laborCost)}</span>
                    <BsAmount amount={prop.laborCost} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                  </div>
                ),
              },
              {
                key: "totalCost",
                label: "Costo Total",
                width: "9rem",
                align: "right",
                render: (prop) => (
                  <div>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`font-mono font-black text-sm ${prop.id === best?.id ? "text-success-700" : "text-slate-700"}`}>
                        {formatCurrency(prop.totalCost)}
                      </span>
                      {prop.id === best?.id && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-success-100 text-success-800 px-1.5 py-0.5 rounded-md border border-success-200">
                          Mejor
                        </span>
                      )}
                    </div>
                    <BsAmount amount={prop.totalCost} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                  </div>
                ),
              },
              {
                key: "semaphore",
                label: "Semáforo",
                width: "6.5rem",
                align: "center",
                render: (prop) => {
                  const authorized = project.approvedInvestmentAmount ?? 0;
                  const pct = authorized > 0 ? (prop.totalCost / authorized) * 100 : 0;
                  const colors = SEMAPHORE_COLORS[levelOf(pct)];
                  return (
                    <div className="flex flex-col items-center gap-1 w-20">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] border ${colors.text} ${colors.bg}`}>
                        <Gauge className="h-3 w-3" />
                        {Math.round(pct)}%
                      </span>
                      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  );
                },
              },
              { key: "deliveryWeeks", label: "Entrega", width: "6.5rem", align: "center", render: (prop) => <span className="text-slate-600 font-semibold">{formatProposalDuration(prop)}</span> },
              {
                key: "advance",
                label: "Anticipo Pactado",
                width: "8rem",
                align: "center",
                render: (prop) => {
                  const exceedsMax = prop.negotiatedAdvancePercent > maxAdvancePercent;
                  return (
                    <>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                          exceedsMax
                            ? "bg-warning-50 text-warning-800 border-warning-200"
                            : "bg-success-50 text-success-800 border-success-200"
                        }`}
                      >
                        {exceedsMax && <AlertTriangle className="h-3 w-3" />}
                        {prop.negotiatedAdvancePercent}%
                      </span>
                      <div className="text-[9px] text-slate-400 mt-1 font-semibold">
                        ({formatCurrency(prop.totalCost * (prop.negotiatedAdvancePercent / 100))}
                        {hasRates && ` · Bs. ${formatBs(convert(prop.totalCost * (prop.negotiatedAdvancePercent / 100), "USD"))}`})
                      </div>
                      {exceedsMax && (
                        <div className="text-[8px] text-warning-600 font-bold mt-0.5">Supera máx. {maxAdvancePercent}%</div>
                      )}
                    </>
                  );
                },
              },
              {
                key: "actions",
                label: "Contratación",
                width: "11.5rem",
                align: "center",
                render: (prop) => {
                  const authorized = project.approvedInvestmentAmount ?? 0;
                  const executedPct = authorized > 0 ? (prop.totalCost / authorized) * 100 : 0;
                  return (
                    <div className="flex items-center justify-center gap-1.5">
                      <Tooltip content="Inspeccionar" placement="top">
                        <Button
                          id={`btn-inspect-${project.id}-${prop.contractorCode}`}
                          onClick={() => onInspect(prop)}
                          variant="secondary"
                          size="sm"
                          icon={<Eye className="h-3.5 w-3.5" />}
                        />
                      </Tooltip>
                      <Button
                        id={`btn-hire-${project.id}-${prop.contractorCode}`}
                        onClick={() => onHire({
                          projectId: project.id,
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
                    </div>
                  );
                },
              },
            ]}
            data={proposals}
            rowKey={(prop) => prop.id}
            selectedRowKey={best?.id}
            selectedRowClass="bg-success-50/60 ring-1 ring-success-200"
          />
        </div>
      </div>
    </Modal>
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

  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

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
  const [inspectingProposal, setInspectingProposal] = useState<Proposal | null>(null);

  const pendingContractSelection = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.COMPARATIVA_ENVIADA),
    [projects],
  );

  const selectedProject = pendingContractSelection.find(p => p.id === selectedId) ?? null;

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
      setSelectedId("");
    } finally {
      setIsRejecting(false);
    }
  };

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pendingContractSelection.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q),
    );
  }, [pendingContractSelection, query]);

  const columns: Column<Project>[] = useMemo(() => [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-[10px] text-success-700 whitespace-nowrap">{p.id}</span>,
    },
    {
      key: "title",
      label: "Título / Ubicación",
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{p.title}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate">{p.location}</div>
        </div>
      ),
    },
    {
      key: "proposals",
      label: "Propuestas",
      width: "7rem",
      align: "center",
      sortValue: (p) => p.proposals?.length ?? 0,
      render: (p) => <span className="font-mono font-bold text-[11px] text-slate-600">{p.proposals?.length ?? 0}</span>,
    },
    {
      key: "best",
      label: "Mejor Oferta",
      width: "9rem",
      align: "right",
      sortValue: (p) => {
        const proposals = p.proposals ?? [];
        if (proposals.length === 0) return Infinity;
        return proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]).totalCost;
      },
      render: (p) => {
        const proposals = p.proposals ?? [];
        const best = proposals.length > 0 ? proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]) : null;
        if (!best) return <span className="font-mono font-black text-success-700 whitespace-nowrap">—</span>;
        return (
          <div className="text-right whitespace-nowrap">
            <div className="font-mono font-black text-success-700">{formatCurrency(best.totalCost)}</div>
            <BsAmount amount={best.totalCost} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
          </div>
        );
      },
    },
  ], [convert, hasRates, isLoadingRates]);

  return (
    <>
      <Card accent="success" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 shrink-0">
          <SectionHeader
            icon={<Users className="h-5 w-5" />}
            title="Evaluación Comparativa de Ofertas y Contratación"
            description="Examine el cuadro comparativo estructurado por los Analistas. Seleccione el contratista idóneo considerando precio, plazo y condiciones de anticipo."
            color="emerald"
          />
        </div>

        <TableToolbar
          searchId="bid-evaluation-search"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Buscar por título, ID o ubicación..."
          searchAriaLabel="Buscar expedientes por adjudicar"
          countIcon={<Users />}
          filteredCount={visibleProjects.length}
          totalCount={pendingContractSelection.length}
          noun="cuadro"
          nounPlural="cuadros"
          viewToggle={{ ...viewToggle, accent: "success" }}
        />

        <AnimatePresence mode="wait">
          {viewMode === "table" ? (
            <motion.div key="table" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" ref={containerRef} className="flex-1 min-h-0 px-6 pb-6 pt-4">
              <Table
                columns={columns}
                data={visibleProjects}
                rowKey={(p) => p.id}
                pageSize={pageSize}
                fillViewport
                stickyHeader
                onRowClick={(p) => setSelectedId(p.id)}
                selectedRowKey={selectedId}
                emptyState={
                  <EmptyState
                    message={pendingContractSelection.length === 0 ? "No hay propuestas ni cuadros comparativos pendientes por revisión de contratación en este momento." : "No hay expedientes que coincidan con la búsqueda."}
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          ) : (
            <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
              <GridView
                items={visibleProjects}
                rowKey={(p) => p.id}
                renderCard={(p) => renderBidEvaluationCard(p, convert, hasRates, isLoadingRates)}
                onSelect={(p) => setSelectedId(p.id)}
                selectedKey={selectedId}
                cardAccent={() => "success"}
                emptyState={
                  <EmptyState
                    message={pendingContractSelection.length === 0 ? "No hay propuestas ni cuadros comparativos pendientes por revisión de contratación en este momento." : "No hay expedientes que coincidan con la búsqueda."}
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── Cuadro comparativo completo del expediente seleccionado ── */}
      {selectedProject && (
        <BidEvaluationDetail
          project={selectedProject}
          onClose={() => setSelectedId("")}
          onOpenAiEval={() => setAiEvalProject(selectedProject)}
          onOpenReject={() => handleOpenReject(selectedProject)}
          onHire={setConfirmSelect}
          onInspect={setInspectingProposal}
          levelOf={levelOf}
          maxAdvancePercent={maxAdvancePercent}
          convert={convert}
          hasRates={hasRates}
          isLoadingRates={isLoadingRates}
        />
      )}

      {/* ── Inspección de detalle de propuesta ── */}
      {inspectingProposal && selectedProject && (
        <InspectProposalModal
          project={selectedProject}
          proposal={inspectingProposal}
          authToken={authToken}
          onClose={() => setInspectingProposal(null)}
        />
      )}

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
          <p className="text-xs text-danger-600/80 font-medium leading-relaxed">
            Se eliminarán todas las propuestas cargadas y el proyecto regresará a <strong>Carga de Propuestas de Contratistas</strong> para que los Analistas inicien una nueva ronda.
          </p>
          <div>
            <label htmlFor="bid-evaluation-reject-reason" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-danger-600">
              Motivo del rechazo
              <RequiredMark filled={rejectReason.trim().length > 0} />
            </label>
            <textarea
              id="bid-evaluation-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej. Los precios presentados superan el presupuesto autorizado. Se requiere nueva ronda de licitación."
              className="w-full rounded-xl border border-danger-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-danger-400 focus:ring-2 focus:ring-danger-100 resize-none"
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