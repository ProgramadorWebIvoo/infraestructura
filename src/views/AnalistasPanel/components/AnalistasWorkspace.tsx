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
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Project, Contractor, Proposal, ProposalOrigin, SupplierMaterialProposal } from "../../../types";
import {
  AlertTriangle,
  Award,
  Bell,
  Eye,
  FileSpreadsheet,
  Handshake,
  MessageSquareWarning,
  Send,
  SearchX,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import TableToolbar from "../../../components/UI/TableToolbar";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import Button from "../../../components/UI/Button";
import ConfirmDialog from "../../../components/UI/ConfirmDialog";
import ProposalSummary from "../../../components/ProposalSummary";
import Tooltip from "../../../components/UI/Tooltip";
import { renderAnalistasCard } from "./AnalistasGridCard";
import RegisterProposalModal, { formatProposalDuration } from "./RegisterProposalModal";
import RenegotiateProposalModal from "./RenegotiateProposalModal";
import InspectProposalModal from "../../ProcuraPanel/components/InspectProposalModal";
import { useMaxAdvancePercent } from "../../../hooks/useMaxAdvancePercent";
import { useSupplierProposalsForProject } from "../../../hooks/useSupplierProposalsForProject";
import { calculatePendingPortalProposals } from "../utils/portalProposalUtils";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useTableViewMode } from "../../../hooks/useTableViewMode";
import { useToast } from "../../../components/UI/Toast";
import { viewSwitchVariants } from "../../../animations";
import { formatCurrency, formatNumber } from "../../../utils";
import { useCurrencyConversion } from "../../../hooks/useCurrencyConversion";
import BsAmount from "../../../components/UI/BsAmount";

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

type RenegotiationPayload = Omit<Proposal, "id" | "contractorCode" | "contractorName" | "contractorRating" | "origen" | "precioAnterior" | "precioNuevo" | "diferencia">;

interface AnalistasWorkspaceProps {
  pendingLicitacion: Project[];
  contractors: Contractor[];
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRenegotiateProposal: (projectId: string, proposalId: string, renegotiation: RenegotiationPayload) => Promise<void>;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  authToken: string;
}

export default function AnalistasWorkspace({
  pendingLicitacion,
  contractors,
  onAddProposal,
  onRenegotiateProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  authToken,
}: AnalistasWorkspaceProps) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const { containerRef, rows: pageSize } = useContainerRows();
  const { fetchForProject } = useSupplierProposalsForProject(authToken);
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();
  const [portalProposalsByProject, setPortalProposalsByProject] = useState<Record<string, SupplierMaterialProposal[]>>({});

  const selectedProject = pendingLicitacion.find(p => p.id === selectedId) ?? null;

  // Cargar propuestas del portal una sola vez al montar (para mostrar badges en grid)
  React.useEffect(() => {
    const loadSupplierProposals = async () => {
      const result: Record<string, SupplierMaterialProposal[]> = {};
      for (const project of pendingLicitacion) {
        result[project.id] = await fetchForProject(project.id);
      }
      setPortalProposalsByProject(result);
    };
    loadSupplierProposals();
  }, [pendingLicitacion, fetchForProject]);

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

  const columns: Column<Project>[] = useMemo(() => [
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
      width: "10rem",
      align: "right",
      sortable: true,
      render: (p) => (
        <div className="text-right whitespace-nowrap">
          <div className="font-mono font-bold text-slate-600">{formatCurrency(p.approvedInvestmentAmount ?? 0)}</div>
          <BsAmount amount={p.approvedInvestmentAmount ?? 0} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
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
      width: "9.5rem",
      align: "right",
      sortValue: (p) => {
        const proposals = p.proposals ?? [];
        if (proposals.length === 0) return Infinity;
        return proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]).totalCost;
      },
      render: (p) => {
        const proposals = p.proposals ?? [];
        const best = proposals.length > 0 ? proposals.reduce((a, b) => (b.totalCost < a.totalCost ? b : a), proposals[0]) : null;
        if (!best) return <span className="font-mono font-black text-emerald-700 whitespace-nowrap">—</span>;
        return (
          <div className="text-right whitespace-nowrap">
            <div className="font-mono font-black text-emerald-700">{formatCurrency(best.totalCost)}</div>
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
                renderCard={(p) => renderAnalistasCard(p, portalProposalsByProject[p.id] ?? [], convert, hasRates, isLoadingRates)}
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
          pendingSupplierProposals={portalProposalsByProject[selectedProject.id] ?? []}
          onClose={() => setSelectedId("")}
          onAddProposal={onAddProposal}
          onRenegotiateProposal={onRenegotiateProposal}
          onRemoveProposal={onRemoveProposal}
          onSubmitComparative={onSubmitComparative}
          onImportSupplierProposals={onImportSupplierProposals}
          onComparativeSubmitted={() => setSelectedId("")}
          authToken={authToken}
        />
      )}
    </>
  );
}

/** Modal de detalle: registrar oferta + cuadro comparativo + envío a Procura, para un solo expediente. */
function ExpedienteWorkspaceModal({
  project,
  contractors,
  pendingSupplierProposals,
  onClose,
  onAddProposal,
  onRenegotiateProposal,
  onRemoveProposal,
  onSubmitComparative,
  onImportSupplierProposals,
  onComparativeSubmitted,
  authToken,
}: {
  project: Project;
  contractors: Contractor[];
  pendingSupplierProposals: SupplierMaterialProposal[];
  onClose: () => void;
  onAddProposal: (projectId: string, proposal: Omit<Proposal, "id">) => void;
  onRenegotiateProposal: (projectId: string, proposalId: string, renegotiation: RenegotiationPayload) => Promise<void>;
  onRemoveProposal: (projectId: string, proposalId: string) => void;
  onSubmitComparative: (projectId: string) => void;
  onImportSupplierProposals?: (projectId: string) => Promise<ImportResult>;
  onComparativeSubmitted: () => void;
  authToken: string;
}) {
  const maxAdvancePercent = useMaxAdvancePercent();
  const { showToast } = useToast();
  const { convert, hasRates, isLoading: isLoadingRates } = useCurrencyConversion();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [renegotiatingProposal, setRenegotiatingProposal] = useState<Proposal | null>(null);
  const [inspectingProposal, setInspectingProposal] = useState<Proposal | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const proposals = project.proposals ?? [];
  const approvedBudget = project.approvedInvestmentAmount ?? 0;
  const pendingPortalCount = calculatePendingPortalProposals(pendingSupplierProposals.length, proposals);

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
      width: "8.5rem",
      align: "right",
      render: (prop) => (
        <div>
          <span className={`font-mono font-black text-sm block ${prop.id === best?.id ? "text-emerald-700" : "text-slate-700"}`}>
            {formatCurrency(prop.totalCost)}
          </span>
          <BsAmount amount={prop.totalCost} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} />
        </div>
      ),
    },
    { key: "deliveryWeeks", label: "Plazo", width: "6.5rem", align: "center", render: (prop) => <span className="text-slate-600 font-semibold">{formatProposalDuration(prop)}</span> },
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
      width: "8rem",
      align: "center",
      render: (prop) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip content="Inspeccionar detalle completo de la propuesta.">
            <button
              id={`btn-inspect-proposal-${prop.id}`}
              onClick={() => setInspectingProposal(prop)}
              className="text-slate-400 hover:bg-slate-50 hover:text-slate-600 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
              aria-label={`Inspeccionar propuesta de ${prop.contractorName}`}
            >
              <Eye className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Renegociar: reemplaza esta oferta por nuevas condiciones, conservando el registro original para auditoría.">
            <button
              id={`btn-renegotiate-proposal-${prop.id}`}
              onClick={() => setRenegotiatingProposal(prop)}
              className="text-amber-500 hover:bg-amber-50 hover:text-amber-600 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
              aria-label={`Renegociar propuesta de ${prop.contractorName}`}
            >
              <Handshake className="h-4 w-4" />
            </button>
          </Tooltip>
          <button
            id={`btn-delete-proposal-${prop.id}`}
            onClick={() => onRemoveProposal(project.id, prop.id)}
            className="text-rose-400 hover:bg-rose-50 hover:text-rose-600 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
            aria-label={`Eliminar propuesta de ${prop.contractorName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Techo de Inversión Aprobado</span>
              <span className="font-mono text-slate-700 font-black">{formatCurrency(approvedBudget)}</span>
              <BsAmount amount={approvedBudget} convert={convert} hasRates={hasRates} isLoading={isLoadingRates} variant="inline" />
            </div>
            {pendingPortalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-danger-100 text-danger-700 whitespace-nowrap animate-pulse">
                <AlertTriangle className="h-3 w-3" /> {pendingPortalCount} sin cargar
              </span>
            )}
          </div>

          {/* Resumen comparativo — solo aparece con al menos 1 propuesta cargada */}
          <ProposalSummary project={project} />

          {/* Cuadro comparativo de propuestas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Propuestas Ingresadas ({proposals.length})
              </span>
              <Button
                id="btn-analistas-open-register"
                onClick={() => setIsRegisterModalOpen(true)}
                variant="primary"
                colorScheme="emerald"
                size="sm"
                icon={<UserPlus className="h-3.5 w-3.5" />}
              >
                Registrar oferta
              </Button>
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
                    message="Ninguna oferta registrada. Use el botón «Registrar oferta» para cargar una manualmente o importar desde el portal de proveedores."
                  />
                }
              />
            </div>
          </div>
        </div>
      </Modal>

      {isRegisterModalOpen && (
        <RegisterProposalModal
          project={project}
          contractors={contractors}
          onClose={() => setIsRegisterModalOpen(false)}
          onAddProposal={onAddProposal}
          onImportSupplierProposals={onImportSupplierProposals}
        />
      )}

      {renegotiatingProposal && (
        <RenegotiateProposalModal
          project={project}
          proposal={renegotiatingProposal}
          onClose={() => setRenegotiatingProposal(null)}
          onRenegotiateProposal={onRenegotiateProposal}
        />
      )}

      {inspectingProposal && (
        <InspectProposalModal
          project={project}
          proposal={inspectingProposal}
          authToken={authToken}
          onClose={() => setInspectingProposal(null)}
        />
      )}

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
