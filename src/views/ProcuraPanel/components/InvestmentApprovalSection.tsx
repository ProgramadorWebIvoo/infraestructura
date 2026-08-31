/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Procura: autorización de inversión inicial — extraída de
 * ProcuraPanel.
 *
 * La autorización se realiza en un modal tipo wizard (Revisar → Autorizar)
 * para no expandir el layout de la página al abrir el formulario.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckSquare, MapPin, SearchX, TrendingUp } from "lucide-react";
import Button from "../../../components/UI/Button";
import { useToast } from "../../../components/UI/Toast";
import { downloadProjectDocument } from "../../../services/api";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import NumericInput from "../../../components/UI/NumericInput";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import DossierEvaluationSummary from "../../../components/DossierEvaluationSummary";
import TableToolbar from "../../../components/UI/TableToolbar";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import Stepper, { type StepDefinition } from "../../../components/UI/Stepper";
import { RequiredMark, HelpHint } from "../../../components/UI/HintSignals";
import { renderInvestmentApprovalCard } from "./InvestmentApprovalGridCard";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useTableViewMode } from "../../../hooks/useTableViewMode";
import { viewSwitchVariants, springs } from "../../../animations";
import { formatNumber } from "../../../utils";
import { ProjectStatus } from "../../../types";
import type { Project, ProjectDocument } from "../../../types";
import { useCurrencyConversion, formatBs } from "../../../hooks/useCurrencyConversion";
import BsAmount from "../../../components/UI/BsAmount";

const WIZARD_STEPS: StepDefinition[] = [
  { id: "revisar", label: "Revisar", description: "Expediente y evaluación IA" },
  { id: "autorizar", label: "Autorizar", description: "Tope presupuestario" },
];

interface InvestmentApprovalSectionProps {
  projects: Project[];
  authToken: string;
  onApproveInvestment: (projectId: string, notes: string, approvedAmount: number) => void;
}

export default function InvestmentApprovalSection({ projects, authToken, onApproveInvestment }: InvestmentApprovalSectionProps) {
  const { showToast } = useToast();
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [procuraNotes, setProcuraNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<number | "">("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [query, setQuery] = useState("");
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  const pendingInvestmentApproval = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.REVISADO_CIERRE),
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pendingInvestmentApproval.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q),
    );
  }, [pendingInvestmentApproval, query]);

  const columns: Column<Project>[] = useMemo(() => [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-[10px] text-brand-600 whitespace-nowrap">{p.id}</span>,
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
      key: "type",
      label: "Tipo",
      width: "5.5rem",
      sortable: true,
      render: (p) => (
        <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-lg border whitespace-nowrap bg-slate-100 text-slate-700 border-slate-200">
          {p.type === "INFRAESTRUCTURA" ? "INFRA" : "MANT"}
        </span>
      ),
    },
    {
      key: "createdDate",
      label: "Fecha",
      width: "7rem",
      sortable: true,
      render: (p) => <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{p.createdDate}</span>,
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "9rem",
      align: "right",
      sortable: true,
      render: (p) => (
        <div className="text-right whitespace-nowrap">
          <div className="font-mono font-bold text-slate-800">${formatNumber(p.estimatedTotal)}</div>
          <BsAmount amount={p.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
        </div>
      ),
    },
  ], [convert, hasRates, isLoadingRates]);
  const activeReviewProject = pendingInvestmentApproval.find(p => p.id === selectedReviewId);

  const handleDownload = async (doc: ProjectDocument) => {
    if (!activeReviewProject) return;
    try {
      await downloadProjectDocument(activeReviewProject.id, doc, authToken);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  const openReview = (p: Project) => {
    setSelectedReviewId(p.id);
    setStepIndex(0);
    setFurthestStepIndex(0);
    setApprovedAmount(p.estimatedTotal);
    setProcuraNotes("");
  };

  const closeReview = () => {
    setSelectedReviewId("");
    setStepIndex(0);
    setFurthestStepIndex(0);
    setProcuraNotes("");
    setApprovedAmount("");
  };

  const handleApproveInvestmentSubmit = () => {
    if (!activeReviewProject) return;
    const amountNum = approvedAmount === "" ? 0 : approvedAmount;
    if (amountNum <= 0) {
      showToast("Introduce un monto de inversión autorizado válido.", "warning");
      return;
    }
    if (!procuraNotes.trim()) {
      showToast("Introduce una nota de autorización.", "warning");
      return;
    }
    onApproveInvestment(activeReviewProject.id, procuraNotes, amountNum);
    setSelectedReviewId("");
    setStepIndex(0);
    setFurthestStepIndex(0);
    setProcuraNotes("");
    setApprovedAmount("");
  };

  const emptyMessage = pendingInvestmentApproval.length === 0
    ? "No hay nuevas peticiones aprobadas por Cierre de Obra esperando tope presupuestario."
    : "No hay peticiones que coincidan con la búsqueda.";

  return (
    <Card accent="brand" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
      <div className="px-6 pt-6 shrink-0">
        <SectionHeader
          icon={<TrendingUp className="h-5 w-5" />}
          title="Autorización de Inversión Inicial"
          description="Autorice el envío de expedientes de obra para la ronda de licitación. Fije los límites presupuestarios según las cubicaciones corregidas."
          color="sky"
        />
      </div>

      <TableToolbar
        searchId="procura-investment-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por título, ID o ubicación..."
        searchAriaLabel="Buscar peticiones listas para Procura"
        countIcon={<TrendingUp />}
        filteredCount={visibleProjects.length}
        totalCount={pendingInvestmentApproval.length}
        noun="pendiente"
        nounPlural="pendientes"
        viewToggle={viewToggle}
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
              onRowClick={(p) => openReview(p)}
              selectedRowKey={selectedReviewId}
              emptyState={<EmptyState message={emptyMessage} icon={<SearchX className="h-8 w-8" />} />}
            />
          </motion.div>
        ) : (
          <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
            <GridView
              items={visibleProjects}
              rowKey={(p) => p.id}
              renderCard={(p) => renderInvestmentApprovalCard(p, convert, hasRates, isLoadingRates)}
              onSelect={(p) => openReview(p)}
              selectedKey={selectedReviewId}
              cardAccent={() => "brand"}
              emptyState={<EmptyState message={emptyMessage} icon={<SearchX className="h-8 w-8" />} />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Wizard de autorización ── */}
      <Modal
        isOpen={!!activeReviewProject}
        onClose={closeReview}
        maxWidth="max-w-2xl"
        icon={<TrendingUp className="h-5 w-5" />}
        iconColor="sky"
        badge="Autorización de Inversión"
        title={activeReviewProject ? `Expediente ${activeReviewProject.id}` : ""}
        infoLine={activeReviewProject ? `${activeReviewProject.title} · ${activeReviewProject.location}` : ""}
        footer={
          activeReviewProject ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {stepIndex === 0 ? "Revisa el expediente y la documentación de Cierre de Obra" : "Confirma el monto autorizado para licitación"}
              </span>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <Button variant="secondary" onClick={() => setStepIndex(i => i - 1)}>
                    Atrás
                  </Button>
                )}
                {stepIndex < 1 ? (
                  <Button
                    variant="primary"
                    colorScheme="sky"
                    onClick={() => {
                      setStepIndex(1);
                      setFurthestStepIndex(i => Math.max(i, 1));
                    }}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    id="btn-procura-approve-investment"
                    variant="primary"
                    colorScheme="sky"
                    onClick={handleApproveInvestmentSubmit}
                    icon={<CheckSquare className="h-4 w-4" />}
                  >
                    Autorizar Presupuesto y Enviar a Licitación
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {activeReviewProject && (
          <div className="space-y-6">
            <Stepper
              steps={WIZARD_STEPS}
              currentIndex={stepIndex}
              furthestVisitedIndex={furthestStepIndex}
              onStepClick={setStepIndex}
              ariaLabel="Progreso de autorización"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={springs.snappy}
              >
                {/* Paso 1: Revisar expediente */}
                {stepIndex === 0 && (
                  <div className="space-y-5">
                    <div className="p-4 bg-gradient-to-br from-brand-50/40 to-white rounded-xl text-xs space-y-2 border border-brand-100/60 font-medium">
                      <div className="flex justify-between items-center">
                        <strong className="font-bold text-slate-400">Estimado de Materiales (Cierre Obra):</strong>
                        <span className="text-right">
                          <span className="font-mono font-bold text-brand-700 block">${formatNumber(activeReviewProject.estimatedTotal)}</span>
                          <BsAmount amount={activeReviewProject.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {activeReviewProject.location}
                      </div>
                      <div className="text-slate-500 italic leading-relaxed pt-2 border-t border-brand-100/60">
                        <span className="font-bold not-italic text-slate-600">Nota Cierre de Obra: </span>
                        {activeReviewProject.cierreObraNotes}
                      </div>
                    </div>

                    {/* Evaluación IA del expediente (mismo panel que ve el
                        auditor en Cierre de Obra), en modo solo-lectura — acá
                        sí se muestra el monto sugerido (showSuggestedAmount),
                        a diferencia de Cierre de Obra donde es criterio de
                        aprobación/rechazo técnico, no de presupuesto. */}
                    {activeReviewProject.dossierAiEvaluatedAt && (
                      <DossierEvaluationSummary project={activeReviewProject} showSuggestedAmount />
                    )}

                    <ProjectDocumentsList
                      project={activeReviewProject}
                      onDownload={handleDownload}
                      onPreview={setPreviewDoc}
                    />
                  </div>
                )}

                {/* Paso 2: Autorizar presupuesto */}
                {stepIndex === 1 && (
                  <div className="space-y-5">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Expediente</span>
                        <span className="font-mono font-black text-slate-800">{activeReviewProject.id}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Estimado Cierre de Obra</span>
                        <span className="text-right">
                          <span className="font-mono font-black text-brand-700 block">${formatNumber(activeReviewProject.estimatedTotal)}</span>
                          <BsAmount amount={activeReviewProject.estimatedTotal} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                        </span>
                      </div>
                      {activeReviewProject.dossierAiSuggestedAmount != null && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 font-bold text-slate-600 uppercase tracking-wider text-[9px]">
                            Sugerido por IA (referencial)
                            <HelpHint content="Monto propuesto por la evaluación IA del expediente en Cierre de Obra. Es solo referencia — nunca autocompleta este formulario." />
                          </span>
                          <span className="text-right">
                            <span className="font-mono font-black text-slate-500 block">${formatNumber(activeReviewProject.dossierAiSuggestedAmount)}</span>
                            <BsAmount amount={activeReviewProject.dossierAiSuggestedAmount} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="procura-approved-amount" className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Inversión Aprobada Autorizada ($)
                        <RequiredMark filled={approvedAmount !== "" && approvedAmount > 0} />
                      </label>
                      <NumericInput
                        id="procura-approved-amount"
                        value={approvedAmount}
                        onChange={setApprovedAmount}
                        placeholder="0.00"
                        className="focus:ring-brand-500"
                      />
                      {hasRates && typeof approvedAmount === "number" && approvedAmount > 0 && (
                        <p className="mt-1.5 text-[10px] font-mono font-semibold text-slate-500">
                          ≈ Bs. {formatBs(convert(approvedAmount, "USD"))}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="procura-notes" className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Notas de Aprobación de Presupuesto
                        <RequiredMark filled={procuraNotes.trim().length > 0} />
                      </label>
                      <input
                        id="procura-notes"
                        type="text"
                        placeholder="Ej. Proyecto urgente de climatización, habilitar licitaciones prioritarias."
                        value={procuraNotes}
                        onChange={(e) => setProcuraNotes(e.target.value)}
                        className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-brand-500 bg-white font-medium"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </Modal>

      {activeReviewProject && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          projectId={activeReviewProject.id}
          document={previewDoc}
          authToken={authToken}
          onDownload={handleDownload}
        />
      )}
    </Card>
  );
}