/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 1 de Cierre de Obra: revisión de cálculos y planos — extraída de
 * CierreObraPanel.
 *
 * Orquestador delgado: solo mantiene la selección del expediente activo (vía
 * la tabla) y coordina la apertura de los dos modales — el wizard de
 * revisión (ReviewWizardModal) y el de rechazo (RejectProjectModal), cada
 * uno con su propio estado de paso/formulario aislado.
 */

import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, MapPin } from "lucide-react";
import type { Project } from "../../../types";
import { ProjectStatus } from "../../../types";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import { Table, type Column } from "../../../components/UI/Table";
import { formatNumber } from "../../../utils";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { ProjectTypeBadge } from "./TechnicalReviewPresentational";
import ReviewWizardModal from "./ReviewWizardModal";
import RejectProjectModal from "./RejectProjectModal";

interface TechnicalReviewSectionProps {
  projects: Project[];
  authToken: string;
  onReviewProject: (projectId: string, notes: string) => void;
  onRejectProject: (
    projectId: string,
    reason: string,
    observations?: string,
    correctionFiles?: File[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onSyncProject: (project: Project) => void;
}

export default function TechnicalReviewSection({ projects, authToken, onReviewProject, onRejectProject, onSyncProject }: TechnicalReviewSectionProps) {
  const { containerRef, rows: pageSize } = useContainerRows();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const pendingReview = useMemo(
    () => projects.filter(p => p.status === ProjectStatus.CREADO),
    [projects],
  );
  const activeProject = pendingReview.find(p => p.id === selectedProjectId);
  const brand = SEMANTIC_COLOR_MAP.brand;

  const columns: Column<Project>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className={`font-mono font-bold text-[10px] ${brand.text600} whitespace-nowrap`}>{p.id}</span>,
    },
    {
      key: "title",
      label: "Título / Ubicación",
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-800 truncate">{p.title}</div>
          <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {p.location}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      width: "5.5rem",
      sortable: true,
      render: (p) => <ProjectTypeBadge type={p.type} />,
    },
    {
      key: "createdDate",
      label: "Fecha",
      width: "7rem",
      sortable: true,
      render: (p) => <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">{p.createdDate}</span>,
    },
    {
      key: "materials",
      label: "Insumos",
      width: "6rem",
      align: "right",
      render: (p) => <span className="font-mono text-[11px] font-bold text-slate-600">{p.materials.length}</span>,
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "7.5rem",
      align: "right",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-slate-800 whitespace-nowrap">${formatNumber(p.estimatedTotal)}</span>,
    },
  ];

  const closeReview = () => setSelectedProjectId("");

  return (
    <Card accent="brand" className="min-h-0 flex-1" fillHeight>
      <SectionHeader
        icon={<Calculator className="h-5 w-5" />}
        title="Cierre de Obra: Revisión de Cálculos y Planos"
        description="Valide la inversión, revise la cubicación de materiales y aporte la planimetría de cierre."
        color="sky"
      />

      {pendingReview.length === 0 ? (
        <EmptyState
          message="No hay nuevas peticiones técnicas pendientes de revisión por Cierre de Obra."
          icon={<CheckCircle2 className="h-10 w-10 text-success-500" />}
        />
      ) : (
        <div className="min-h-0 flex-1 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Seleccionar Expediente a Revisar:
            </label>
            <span className={`text-[10px] font-mono font-bold ${brand.text600} ${brand.bg50} border ${brand.border100} px-2 py-0.5 rounded-lg`}>
              {pendingReview.length} pendiente{pendingReview.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div ref={containerRef} className="flex-1 min-h-0">
            <Table
              columns={columns}
              data={pendingReview}
              rowKey={(p) => p.id}
              pageSize={pageSize}
              fillViewport
              onRowClick={(p) => setSelectedProjectId(p.id)}
              selectedRowKey={selectedProjectId}
            />
          </div>
        </div>
      )}

      <ReviewWizardModal
        project={activeProject}
        authToken={authToken}
        onReviewProject={onReviewProject}
        onSyncProject={onSyncProject}
        onClose={closeReview}
        onOpenRejectModal={() => setShowRejectModal(true)}
      />

      <RejectProjectModal
        project={activeProject}
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onRejectProject={onRejectProject}
        onRejected={() => {
          setShowRejectModal(false);
          closeReview();
        }}
      />
    </Card>
  );
}
