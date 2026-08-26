/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Convergencia de Carga de Propuestas de Contratistas + Cuadro Comparativo
 * Digital — reemplaza a BidRegistrationSection.tsx + ComparativeTableSection.tsx.
 * Sigue el mismo patrón que ProcuraPanel/components/BidEvaluationSection.tsx:
 * lista compacta seleccionable (TableToolbar + Table/GridView) de expedientes
 * en licitación, que abre un modal grande de detalle por expediente donde se
 * registra la oferta, se revisa el cuadro comparativo y se envía a Procura —
 * antes eran dos secciones desconectadas (picker de expediente a la
 * izquierda, cuadro con scroll interno de 185px a la derecha) sin relación
 * visual evidente entre sí.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Project, Contractor, Proposal, ProposalOrigin } from "../../../types";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  ChevronDown,
  FileSpreadsheet,
  Loader2,
  LayoutList,
  MessageSquareWarning,
  Plus,
  Send,
  SearchX,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import TableToolbar from "../../../components/UI/TableToolbar";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import SelectModal from "../../../components/UI/SelectModal";
import NumericInput from "../../../components/UI/NumericInput";
import Button from "../../../components/UI/Button";
import ConfirmDialog from "../../../components/UI/ConfirmDialog";
import ProposalSummary from "../../../components/ProposalSummary";
import { HelpHint, RequiredMark } from "../../../components/UI/HintSignals";
import Tooltip from "../../../components/UI/Tooltip";
import Tabs from "../../../components/UI/Tabs";
import { renderAnalistasCard } from "./AnalistasGridCard";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useTableViewMode } from "../../../hooks/useTableViewMode";
import { useToast } from "../../../components/UI/Toast";
import { viewSwitchVariants } from "../../../animations";
import { formatCurrency, formatNumber } from "../../../utils";

const ORIGIN_BADGE: Record<ProposalOrigin, { label: string; className: string }> = {
  MANUAL: { label: "Manual", className: "bg-slate-100 text-slate-600 border-slate-200" },
  RENEGOCIACION: { label: "Renegoc.", className: "bg-warning-50 text-warning-800 border-warning-200" },
  "PORTAL-PROV": { label: "Portal", className: "bg-info-50 text-info-800 border-info-200" },
  "SEED-INSERT": { label: "Seed", className: "bg-slate-100 text-slate-400 border-slate-200" },
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
}

interface AnalistasWorkspaceProps {
  pendingLicitacion: Project[];
  contractors: Contractor[];
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
}

export default function AnalistasWorkspace({
  pendingLicitacion,
  contractors,
  onAddProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
}: AnalistasWorkspaceProps) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();

  const selectedProject = pendingLicitacion.find(p => p.id === selectedId) ?? null;

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pendingLicitacion.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q),
    );
  }, [pendingLicitacion, query]);

  const columns: Column<Project>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-[10px] text-emerald-700 whitespace-nowrap">{p.id}</span>,
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
      key: "approvedInvestmentAmount",
      label: "Techo Aprobado",
      width: "9rem",
      align: "right",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-slate-600 whitespace-nowrap">{formatCurrency(p.approvedInvestmentAmount ?? 0)}</span>,
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
        return <span className="font-mono font-black text-emerald-700 whitespace-nowrap">{best ? formatCurrency(best.totalCost) : "—"}</span>;
      },
    },
  ];

  return (
    <>
      <Card accent="success" fillHeight className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 shrink-0">
          <SectionHeader
            icon={<Award className="h-5 w-5" />}
            title="Carga de Propuestas y Cuadro Comparativo"
            description="Seleccione un expediente en licitación para registrar ofertas de contratistas y consolidar su cuadro comparativo."
            color="emerald"
          />
        </div>

        <TableToolbar
          searchId="analistas-search"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Buscar por título, ID o ubicación..."
          searchAriaLabel="Buscar expedientes en licitación"
          countIcon={<Users />}
          filteredCount={visibleProjects.length}
          totalCount={pendingLicitacion.length}
          noun="expediente"
          nounPlural="expedientes"
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
                    message={pendingLicitacion.length === 0 ? "No hay expedientes en licitación activa. Vaya al panel de Procura o Cierre de Obra para avanzar flujos." : "No hay expedientes que coincidan con la búsqueda."}
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
                renderCard={(p) => renderAnalistasCard(p)}
                onSelect={(p) => setSelectedId(p.id)}
                selectedKey={selectedId}
                cardAccent={() => "success"}
                emptyState={
                  <EmptyState
                    message={pendingLicitacion.length === 0 ? "No hay expedientes en licitación activa. Vaya al panel de Procura o Cierre de Obra para avanzar flujos." : "No hay expedientes que coincidan con la búsqueda."}
                    icon={<SearchX className="h-8 w-8" />}
                  />
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {selectedProject && (
        <ExpedienteWorkspaceModal
          project={selectedProject}
          contractors={contractors}
          onClose={() => setSelectedId("")}
          onAddProposal={onAddProposal}
          onRemoveProposal={onRemoveProposal}
          onSubmitComparative={onSubmitComparative}
          onImportSupplierProposals={onImportSupplierProposals}
          onComparativeSubmitted={() => setSelectedId("")}
        />
      )}
    </>
  );
}

/** Modal de detalle: registrar oferta + cuadro comparativo + envío a Procura, para un solo expediente. */
function ExpedienteWorkspaceModal({
  project,
  contractors,
  onClose,
  onAddProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  onComparativeSubmitted,
}: {
  project: Project;
  contractors: Contractor[];
  onClose: () => void;
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  onComparativeSubmitted: () => void;
}) {
  const { showToast } = useToast();
  const maxAdvancePercent = useMaxAdvancePercent();

  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false);
  const [contractorCode, setContractorCode] = useState(contractors[0]?.code ?? "");
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [materialCost, setMaterialCost] = useState<number | "">(1000);
  const [laborCost, setLaborCost] = useState<number | "">(800);
  const [deliveryWeeks, setDeliveryWeeks] = useState<number | "">(2);
  const [advancePercent, setAdvancePercent] = useState<number | "">(30);
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState<Exclude<ProposalOrigin, "PORTAL-PROV" | "SEED-INSERT">>("MANUAL");
  const [fechaOferta, setFechaOferta] = useState(todayISODate());
  const [precioAnterior, setPrecioAnterior] = useState<number | "">("");
  const [precioNuevo, setPrecioNuevo] = useState<number | "">("");
  const [motivo, setMotivo] = useState("");
  const [pendingProposal, setPendingProposal] = useState<Omit<Proposal, "id"> | null>(null);

  const isRenegotiation = origin === "RENEGOCIACION";
  const exceedsAdvanceForMotivo = advancePercent !== "" && advancePercent > maxAdvancePercent;
  const motivoRequired = isRenegotiation || exceedsAdvanceForMotivo;
  const motivoFilled = motivo.trim().length > 0;
  const diferencia = precioAnterior !== "" && precioNuevo !== "" ? precioNuevo - precioAnterior : null;

  const [isImporting, setIsImporting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const contractorOptions = contractors.map(c => ({
    value: c.code,
    label: c.name,
    description: `${c.code} · ${c.specialty} · Rating: ${c.rating.toFixed(1)}`,
    raw: c,
  }));

  const proposals = project.proposals ?? [];
  const newTotal = (Number(materialCost) || 0) + (Number(laborCost) || 0);
  const approvedBudget = project.approvedInvestmentAmount ?? 0;
  const exceedsBudget = approvedBudget > 0 && newTotal > approvedBudget;
  const budgetExcess = newTotal - approvedBudget;
  const exceedsAdvance = advancePercent !== "" && advancePercent > maxAdvancePercent;

  const commitProposal = (proposal: Omit<Proposal, "id">) => {
    onAddProposal(project.id, proposal);
    setDescription("");
    setMaterialCost(1000);
    setLaborCost(800);
    setDeliveryWeeks(2);
    setOrigin("MANUAL");
    setFechaOferta(todayISODate());
    setPrecioAnterior("");
    setPrecioNuevo("");
    setMotivo("");
  };

  const handleAddProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (motivoRequired && !motivoFilled) return;
    const contractor = contractors.find(c => c.code === contractorCode);
    if (!contractor) return;

    const matCostNum = Number(materialCost || 0);
    const laborCostNum = Number(laborCost || 0);
    const delWeeksNum = Number(deliveryWeeks || 1);

    const proposal: Omit<Proposal, "id"> = {
      contractorCode: contractor.code,
      contractorName: contractor.name,
      contractorRating: contractor.rating,
      materialCost: matCostNum,
      laborCost: laborCostNum,
      totalCost: matCostNum + laborCostNum,
      deliveryWeeks: delWeeksNum,
      negotiatedAdvancePercent: Number(advancePercent || 0),
      description: description.trim() || `Propuesta para trabajos de ${project.title}. Incluye materiales e instalación certificada.`,
      origen: origin,
      fechaOferta,
      ...(isRenegotiation && precioAnterior !== "" && precioNuevo !== ""
        ? { precioAnterior, precioNuevo, diferencia: precioNuevo - precioAnterior }
        : {}),
      ...(motivoFilled ? { motivo: motivo.trim() } : {}),
    };

    if (exceedsBudget || exceedsAdvance) {
      setPendingProposal(proposal);
      return;
    }

    commitProposal(proposal);
  };

  const handleConfirmPending = () => {
    if (!pendingProposal) return;
    commitProposal(pendingProposal);
    setPendingProposal(null);
  };

  const handleImport = async () => {
    if (!onImportSupplierProposals) return;
    setIsImporting(true);
    try {
      const result = await onImportSupplierProposals(project.id);
      showToast(result.message, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Error inesperado al importar propuestas.",
        "error",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = () => {
    if (proposals.length === 0) {
      showToast("Agrega al menos una propuesta antes de enviar el cuadro comparativo.", "warning");
      return;
    }
    setConfirmSubmit(true);
  };

  const best = proposals.length > 0 ? proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]) : null;

  const proposalColumns: Column<Proposal>[] = [
    {
      key: "contractor",
      label: "Contratista (Código)",
      width: "14rem",
      render: (prop) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800 text-[12px] truncate">{prop.contractorName}</span>
            {prop.id === best?.id && proposals.length > 1 && (
              <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200 shrink-0">
                Mejor
              </span>
            )}
          </div>
          <div className="font-mono text-[9px] text-emerald-600 font-bold mt-0.5">Código: {prop.contractorCode}</div>
        </div>
      ),
    },
    {
      key: "origen",
      label: "Origen",
      width: "6rem",
      align: "center",
      render: (prop) => {
        const badge = ORIGIN_BADGE[prop.origen] ?? ORIGIN_BADGE.MANUAL;
        const badgeEl = (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[9px] border whitespace-nowrap ${badge.className}`}>
            {prop.motivo && <MessageSquareWarning className="h-3 w-3 shrink-0" />}
            {badge.label}
          </span>
        );
        return prop.motivo ? <Tooltip content={prop.motivo}>{badgeEl}</Tooltip> : badgeEl;
      },
    },
    { key: "materialCost", label: "Materiales", width: "7rem", align: "right", render: (prop) => <span className="font-mono font-medium text-slate-600">{formatCurrency(prop.materialCost)}</span> },
    { key: "laborCost", label: "Mano de Obra", width: "7rem", align: "right", render: (prop) => <span className="font-mono font-medium text-slate-600">{formatCurrency(prop.laborCost)}</span> },
    {
      key: "totalCost",
      label: "Costo Total",
      width: "8rem",
      align: "right",
      render: (prop) => (
        <span className={`font-mono font-black text-sm ${prop.id === best?.id ? "text-emerald-700" : "text-slate-700"}`}>
          {formatCurrency(prop.totalCost)}
        </span>
      ),
    },
    { key: "deliveryWeeks", label: "Plazo", width: "6.5rem", align: "center", render: (prop) => <span className="text-slate-600 font-semibold">{prop.deliveryWeeks > 0 ? `${prop.deliveryWeeks} sem` : "Sin dato"}</span> },
    {
      key: "advance",
      label: "Anticipo",
      width: "7rem",
      align: "center",
      render: (prop) => {
        const exceedsMax = prop.negotiatedAdvancePercent > maxAdvancePercent;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] border ${
              exceedsMax ? "bg-warning-50 text-warning-800 border-warning-200" : "bg-success-50 text-success-800 border-success-200"
            }`}
          >
            {exceedsMax && <AlertTriangle className="h-3 w-3" />}
            {prop.negotiatedAdvancePercent}%
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      width: "3.5rem",
      align: "center",
      render: (prop) => (
        <button
          id={`btn-delete-proposal-${prop.id}`}
          onClick={() => onRemoveProposal(project.id, prop.id)}
          className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
          aria-label={`Eliminar propuesta de ${prop.contractorName}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        maxWidth="max-w-6xl"
        icon={<Users className="h-5 w-5" />}
        iconColor="emerald"
        badge="Carga de Propuestas y Cuadro Comparativo"
        title={`Expediente ${project.id}`}
        infoLine={`${project.title} · ${project.location}`}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Al enviar, se consolida la terna comparativa para la adjudicación por parte de Procura.
            </span>
            <Button
              id="btn-analistas-submit-comparative"
              onClick={handleSubmit}
              variant="primary"
              colorScheme="sky"
              disabled={proposals.length === 0}
              icon={<Send className="h-4 w-4" />}
            >
              Enviar Cuadro a Procura
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Techo de Inversión Aprobado</span>
            <span className="font-mono text-slate-700 font-black">{formatCurrency(approvedBudget)}</span>
          </div>

          {/* Resumen comparativo — solo aparece con al menos 1 propuesta cargada */}
          <ProposalSummary project={project} />

          {/* Registrar oferta — colapsado por defecto: la carga manual es la
              tarea menos frecuente frente a "Traer del portal" e importar,
              así que no debe competir por atención con el cuadro comparativo
              ya cargado. */}
          <div className="rounded-xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50/30 to-white overflow-hidden">
            <button
              type="button"
              id="btn-analistas-toggle-register-form"
              onClick={() => setIsRegisterFormOpen((v) => !v)}
              aria-expanded={isRegisterFormOpen}
              className="w-full flex items-center justify-between gap-2.5 p-5 cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Registrar Oferta del Proveedor</h4>
              </div>
              <motion.span
                animate={{ rotate: isRegisterFormOpen ? 180 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="text-slate-400 shrink-0"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isRegisterFormOpen && (
                <motion.div
                  key="register-form-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddProposal} className="px-5 pb-5 pt-3 border-t border-emerald-100/60 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <Tabs
                        ariaLabel="Origen de la oferta"
                        activeKey={origin}
                        onChange={(key) => setOrigin(key as typeof origin)}
                        layoutId="analistas-origin-tabs"
                        tabs={[
                          { key: "MANUAL", label: "Carga normal" },
                          { key: "RENEGOCIACION", label: "Renegociación" },
                        ]}
                      />
                      <HelpHint content="Registra cómo se obtuvo esta oferta, para poder auditar cuánto se ahorró vía renegociación." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Proveedor / Contratista
                          <RequiredMark filled={!!contractorCode} />
                        </label>
                        <SelectModal
                          isOpen={isContractorModalOpen}
                          onClose={() => setIsContractorModalOpen(false)}
                          onOpen={() => setIsContractorModalOpen(true)}
                          onSelect={(opt) => setContractorCode(opt.value as string)}
                          onDeselect={() => setContractorCode("")}
                          options={contractorOptions}
                          selectedValue={contractorCode}
                          triggerLabel="Seleccionar proveedor..."
                          title="Seleccionar Proveedor"
                          infoLine={`${contractorOptions.length} proveedores disponibles`}
                          icon={<Users className="h-5 w-5" />}
                          iconColor="sky"
                          maxWidth="max-w-xl"
                          searchPlaceholder="Buscar por nombre, código, especialidad..."
                        />
                      </div>

                      <div>
                        <label htmlFor="analistas-weeks" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Semanas de Ejecución
                          <RequiredMark filled={deliveryWeeks !== "" && deliveryWeeks > 0} />
                        </label>
                        <NumericInput id="analistas-weeks" value={deliveryWeeks} onChange={setDeliveryWeeks} min={1} integer placeholder="0" />
                      </div>

                      <div>
                        <label htmlFor="analistas-fecha-oferta" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Fecha de la Oferta
                          <RequiredMark filled={fechaOferta.trim().length > 0} />
                        </label>
                        <input
                          id="analistas-fecha-oferta"
                          type="date"
                          value={fechaOferta}
                          onChange={(e) => setFechaOferta(e.target.value)}
                          max={todayISODate()}
                          className="w-full text-xs px-3.5 py-3 rounded-control border border-border-default outline-hidden focus:ring-2 focus:ring-brand-500 bg-surface font-mono font-bold text-text-secondary"
                        />
                      </div>
                    </div>

                    {isRenegotiation && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-warning-50/50 border border-warning-100">
                        <div>
                          <label htmlFor="analistas-precio-anterior" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Precio Anterior ($)
                            <RequiredMark filled={precioAnterior !== "" && precioAnterior > 0} />
                          </label>
                          <NumericInput id="analistas-precio-anterior" value={precioAnterior} onChange={setPrecioAnterior} min={0} placeholder="0.00" />
                        </div>

                        <div>
                          <label htmlFor="analistas-precio-nuevo" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Precio Nuevo ($)
                            <RequiredMark filled={precioNuevo !== "" && precioNuevo > 0} />
                          </label>
                          <NumericInput id="analistas-precio-nuevo" value={precioNuevo} onChange={setPrecioNuevo} min={0} placeholder="0.00" />
                        </div>

                        <div>
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diferencia</span>
                          <div className="w-full text-xs px-3.5 py-3 rounded-control border border-warning-200 bg-white font-mono font-bold flex items-center gap-1.5">
                            {diferencia === null ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <>
                                <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${diferencia <= 0 ? "text-success-500 -rotate-45" : "text-danger-500 rotate-45"}`} />
                                <span className={diferencia <= 0 ? "text-success-700" : "text-danger-700"}>{formatCurrency(Math.abs(diferencia))}</span>
                                <span className="text-[9px] text-slate-400 normal-case font-medium">{diferencia <= 0 ? "ahorro" : "aumento"}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="analistas-mat-cost" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Costo Materiales ($)
                          <RequiredMark filled={materialCost !== "" && materialCost > 0} />
                        </label>
                        <NumericInput id="analistas-mat-cost" value={materialCost} onChange={setMaterialCost} min={0} placeholder="0.00" />
                      </div>

                      <div>
                        <label htmlFor="analistas-labor-cost" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Costo Mano de Obra ($)
                          <RequiredMark filled={laborCost !== "" && laborCost > 0} />
                        </label>
                        <NumericInput id="analistas-labor-cost" value={laborCost} onChange={setLaborCost} min={0} placeholder="0.00" />
                      </div>

                      <div>
                        <label htmlFor="analistas-advance" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Anticipo Negociado (%)
                          <RequiredMark filled={advancePercent !== "" && advancePercent >= 0} />
                          <HelpHint content={`El máximo permitido por CONFIG APP es ${maxAdvancePercent}%. Anticipos mayores requieren confirmación manual antes de cargarse.`} />
                        </label>
                        <NumericInput id="analistas-advance" value={advancePercent} onChange={setAdvancePercent} min={0} max={100} integer placeholder="0" />
                        {advancePercent !== "" && advancePercent > maxAdvancePercent && (
                          <p className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-600">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Supera el máximo permitido ({maxAdvancePercent}%)
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="analistas-bid-desc" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Alcance y Condiciones de la Oferta
                        <HelpHint content="Opcional. Si se deja vacío, se genera una descripción automática a partir del título del expediente." />
                      </label>
                      <input
                        id="analistas-bid-desc"
                        type="text"
                        placeholder="Ej. Suministro total de cables, incluye garantía y flete."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium"
                      />
                    </div>

                    {exceedsBudget && (
                      <p className="flex items-center gap-1 text-[9px] font-bold text-amber-600">
                        <Wallet className="h-3 w-3 shrink-0" />
                        Supera la inversión autorizada (${formatNumber(approvedBudget)}) en ${formatNumber(budgetExcess)}
                      </p>
                    )}

                    {motivoRequired && (
                      <div>
                        <label htmlFor="analistas-motivo" className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          <MessageSquareWarning className="h-3 w-3 shrink-0 text-warning-500" />
                          Motivo
                          <RequiredMark filled={motivoFilled} />
                          <HelpHint
                            content={
                              isRenegotiation
                                ? "Obligatorio: explica por qué se renegoció esta oferta, para dejar trazabilidad de la excepción."
                                : "Obligatorio: el anticipo negociado excede el máximo configurado en CONFIG APP — justifica esta excepción para auditoría."
                            }
                          />
                        </label>
                        <textarea
                          id="analistas-motivo"
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          rows={2}
                          maxLength={500}
                          placeholder="Ej. Proveedor exige anticipo mayor por escasez de materiales importados."
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-warning-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-warning-500 text-slate-700 font-medium resize-none"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-100/60">
                      <div className="text-xs font-bold text-slate-700">
                        Costo Total Oferta:{" "}
                        <span className={`font-mono text-sm font-black ${exceedsBudget ? "text-amber-700" : "text-emerald-700"}`}>
                          ${formatNumber(newTotal)}
                        </span>
                      </div>
                      <Button
                        id="btn-analistas-add-bid"
                        type="submit"
                        variant="primary"
                        colorScheme="emerald"
                        icon={<Plus className="h-4 w-4" />}
                        disabled={motivoRequired && !motivoFilled}
                      >
                        Agregar al Cuadro
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cuadro comparativo de propuestas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Propuestas Ingresadas ({proposals.length})
              </span>
              {onImportSupplierProposals && (
                <Tooltip content="Importa las propuestas recibidas desde el portal de proveedores, sin necesidad de cargarlas manualmente.">
                  <Button
                    onClick={handleImport}
                    disabled={isImporting}
                    variant="secondary"
                    size="sm"
                    className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                    icon={isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LayoutList className="h-3.5 w-3.5" />}
                  >
                    {isImporting ? "Importando..." : "Traer del portal"}
                  </Button>
                </Tooltip>
              )}
            </div>
            <div className="border border-slate-100 rounded-xl bg-white overflow-hidden shadow-xs">
              <Table
                columns={proposalColumns}
                data={proposals}
                rowKey={(prop) => prop.id}
                selectedRowKey={best?.id}
                selectedRowClass="bg-emerald-50/60 ring-1 ring-emerald-200"
                emptyState={
                  <EmptyState
                    icon={<FileSpreadsheet className="h-6 w-6" />}
                    message="Ninguna oferta registrada. Use el formulario o importe desde el portal de proveedores."
                  />
                }
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingProposal}
        onClose={() => setPendingProposal(null)}
        onConfirm={handleConfirmPending}
        title="¿Está seguro de cargar esta propuesta?"
        message={[
          exceedsBudget
            ? `El costo total (${formatNumber(newTotal)}) supera la inversión autorizada (${formatNumber(approvedBudget)}) en ${formatNumber(budgetExcess)}.`
            : null,
          exceedsAdvance
            ? `El anticipo negociado (${advancePercent}%) supera el máximo permitido en CONFIG APP (${maxAdvancePercent}%).`
            : null,
          "Puede continuar si esta condición fue negociada o autorizada de otra forma.",
        ].filter(Boolean).join(" ")}
        variant="warning"
        confirmLabel="Sí, cargar propuesta"
      />

      <ConfirmDialog
        isOpen={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => {
          onSubmitComparative(project.id);
          onComparativeSubmitted();
          setConfirmSubmit(false);
        }}
        title="Enviar Cuadro Comparativo"
        message={`¿Estás seguro de enviar el cuadro comparativo con ${proposals.length} propuestas a la Gerencia de Procura? Una vez enviado, Procura revisará las ofertas y procederá con la adjudicación.`}
        variant="info"
        confirmLabel="Enviar a Procura"
      />
    </>
  );
}
