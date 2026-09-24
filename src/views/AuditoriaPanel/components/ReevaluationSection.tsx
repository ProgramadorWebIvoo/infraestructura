/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección de Auditoría: expedientes que Procura devolvió a reevaluación
 * (EN_REEVALUACION_AUDITORIA) antes de autorizar inversión — ver
 * ProjectController::sendToReevaluation(). Muestra el motivo indicado por
 * Procura (último AuditLog de esa acción) y, al abrir un expediente, corre
 * el mismo wizard de revisión que TechnicalReviewSection (evaluación IA del
 * expediente, materiales, documentación) en mode="reevaluation" — el auditor
 * pasa por el mismo proceso de revisión antes de reenviar, no un simple
 * botón de confirmación. Al terminar, el expediente vuelve a Procura
 * (REVISADO_AUDITORIA) sin pasar por CREADO, porque la cubicación y planos ya
 * fueron aprobados por Auditoría.
 *
 * Tab explícita del panel (AuditoriaPanel/index.tsx), mismo criterio de
 * layout full-height que TechnicalReviewSection — cuando no hay
 * reevaluaciones pendientes muestra el emptyState de Table en vez de
 * autoocultarse.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, SearchX, Undo2 } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import type { AuditLog, Project } from "@/types";
import { ProjectStatus } from "@/types";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import EmptyState from "@/components/UI/EmptyState";
import TableToolbar from "@/components/UI/TableToolbar";
import { Table, type Column } from "@/components/UI/Table";
import GridView from "@/components/UI/GridView/GridView";
import { SEMANTIC_COLOR_MAP } from "@/components/UI/colorTokens";
import { useContainerRows } from "@/hooks/useContainerRows";
import { useTableViewMode } from "@/hooks/useTableViewMode";
import { viewSwitchVariants } from "@/animations";
import ReviewWizardModal from "./ReviewWizardModal";
import ReevaluationGridCard from "./ReevaluationGridCard";

export const REEVALUATION_REQUEST_ACTION = "Solicitud de reevaluación a Auditoría";

interface ReevaluationSectionProps {
  projects: Project[];
  auditLogs: AuditLog[];
  authToken: string;
  onResolveReevaluation: (projectId: string, notes?: string) => Promise<void> | void;
  onSyncProject: (project: Project) => void;
  onRefresh?: () => Promise<void> | void;
}

function latestReevaluationLog(projectId: string, auditLogs: AuditLog[]): AuditLog | undefined {
  return auditLogs
    .filter((l) => l.projectId === projectId && l.action === REEVALUATION_REQUEST_ACTION)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

export default function ReevaluationSection({ projects, auditLogs, authToken, onResolveReevaluation, onSyncProject, onRefresh }: ReevaluationSectionProps) {
  const { containerRef, rows: pageSize } = useContainerRows();
  const { viewMode, viewToggle } = useTableViewMode("grid");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const warning = SEMANTIC_COLOR_MAP.warning;

  const pendingReevaluation = useMemo(
    () => projects.filter((p) => p.status === ProjectStatus.EN_REEVALUACION_AUDITORIA),
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pendingReevaluation.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q),
    );
  }, [pendingReevaluation, query]);

  const activeProject = pendingReevaluation.find((p) => p.id === selectedId);
  const activeLog = activeProject ? latestReevaluationLog(activeProject.id, auditLogs) : undefined;

  const closeReview = () => setSelectedId("");

  const columns: Column<Project>[] = useMemo(() => [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className={`font-mono font-bold text-[10px] ${warning.text600} whitespace-nowrap`}>{p.id}</span>,
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
      key: "reason",
      label: "Motivo de Procura",
      render: (p) => {
        const log = latestReevaluationLog(p.id, auditLogs);
        return <div className="text-[11px] text-slate-500 max-w-md truncate" title={log?.details}>{log?.details ?? "—"}</div>;
      },
    },
    {
      key: "estimatedTotal",
      label: "Total (Est)",
      width: "8.5rem",
      align: "right",
      sortable: true,
      render: (p) => <span className="font-mono font-bold text-slate-800">{formatCurrency(p.estimatedTotal)}</span>,
    },
  ], [auditLogs, warning.text600]);

  const emptyMessage = pendingReevaluation.length === 0
    ? "No hay expedientes devueltos por Procura para reevaluación en este momento."
    : "No hay expedientes que coincidan con la búsqueda.";

  return (
    <Card accent="warning" className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col" fillHeight>
      <div className="px-6 pt-6 shrink-0">
        <SectionHeader
          icon={<Undo2 className="h-5 w-5" />}
          title="Reevaluaciones Solicitadas por Procura"
          description="Expedientes que Procura devolvió con un motivo antes de autorizar inversión. Corrija lo señalado y reenvíelo."
          color="amber"
        />
      </div>

      <TableToolbar
        searchId="reevaluation-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por título, ID o ubicación..."
        searchAriaLabel="Buscar expedientes en reevaluación"
        countIcon={<Undo2 />}
        filteredCount={visibleProjects.length}
        totalCount={pendingReevaluation.length}
        noun="expediente"
        nounPlural="expedientes"
        viewToggle={{ ...viewToggle, accent: "warning" }}
        onRefresh={onRefresh}
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
              emptyState={<EmptyState message={emptyMessage} icon={<SearchX className="h-8 w-8" />} />}
            />
          </motion.div>
        ) : (
          <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
            <GridView
              items={visibleProjects}
              rowKey={(p) => p.id}
              renderCard={(p) => <ReevaluationGridCard project={p} reason={latestReevaluationLog(p.id, auditLogs)?.details} />}
              onSelect={(p) => setSelectedId(p.id)}
              selectedKey={selectedId}
              cardAccent={() => "warning"}
              emptyState={<EmptyState message={emptyMessage} icon={<SearchX className="h-8 w-8" />} />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ReviewWizardModal
        project={activeProject}
        authToken={authToken}
        mode="reevaluation"
        reevaluationContext={activeLog ? { reason: activeLog.details ?? "", observations: activeLog.observations } : undefined}
        onConfirm={(projectId, notes) => onResolveReevaluation(projectId, notes || undefined)}
        onSyncProject={onSyncProject}
        onClose={closeReview}
      />
    </Card>
  );
}
