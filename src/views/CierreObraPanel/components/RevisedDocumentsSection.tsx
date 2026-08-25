/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección 3 de Cierre de Obra: documentos de proyectos ya revisados (más
 * allá de CREADO) — consulta de solo lectura (preview + descarga). No
 * permite subir nuevas versiones: el versionado (V1→V2) existe únicamente
 * como trazabilidad del ciclo rechazo→corrección→reenvío de Infraestructura
 * (ver useProjectsWorkflows::handleResubmitProject), no como una acción
 * libre sobre cualquier documento ya revisado.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, FileStack, MapPin } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import EmptyState from "../../../components/UI/EmptyState";
import Modal from "../../../components/UI/Modal";
import ProjectDocumentsList from "../../../components/UI/ProjectDocumentsList";
import DocumentPreviewModal from "../../../components/UI/DocumentPreviewModal";
import StatusBadge from "../../../components/UI/StatusBadge";
import Tabs from "../../../components/UI/Tabs";
import TabPanel from "../../../components/UI/TabPanel";
import { Table, type Column } from "../../../components/UI/Table";
import GridView from "../../../components/UI/GridView/GridView";
import TableToolbar from "../../../components/UI/TableToolbar";
import { SEMANTIC_COLOR_MAP } from "../../../components/UI/colorTokens";
import { viewSwitchVariants } from "../../../animations";
import { useContainerRows } from "../../../hooks/useContainerRows";
import { useTableViewMode, type TableViewMode } from "../../../hooks/useTableViewMode";
import { downloadProjectDocument } from "../../../services/api";
import { useToast } from "../../../components/UI/Toast";
import { ProjectStatus } from "../../../types";
import type { AuditLog, Project, ProjectDocument } from "../../../types";
import ProjectIterationsTimeline from "./ProjectIterationsTimeline";
import ExpedienteDetailTab from "./ExpedienteDetailTab";
import { renderExpedienteCard } from "./ExpedienteGridCard";
import { rejectionCountOf } from "./rejectionAudit";

type ModalTabKey = "detalle" | "historial" | "archivos";

interface RevisedDocumentsSectionProps {
  projects: Project[];
  auditLogs: AuditLog[];
  authToken: string;
  /** Vista con la que arranca la sección (Tabla o Grid) — configurable por el
   * consumidor, no recordada automáticamente entre sesiones. */
  defaultViewMode?: TableViewMode;
}

const success = SEMANTIC_COLOR_MAP.success;

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Todos los Estados" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "APPROVED", label: "Aprobados" },
];

export default function RevisedDocumentsSection({ projects, auditLogs, authToken, defaultViewMode = "grid" }: RevisedDocumentsSectionProps) {
  const { showToast } = useToast();
  const { containerRef, rows: pageSize } = useContainerRows();
  const [selectedId, setSelectedId] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalTab, setModalTab] = useState<ModalTabKey>("historial");
  const { viewMode, viewToggle } = useTableViewMode(defaultViewMode);

  // La tab activa por defecto es HISTORIAL — se reinicia a esa vista cada
  // vez que se abre un expediente distinto, en vez de arrastrar la tab que
  // haya quedado seleccionada del expediente previamente inspeccionado.
  useEffect(() => {
    if (selectedId) setModalTab("historial");
  }, [selectedId]);

  const revisedProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (p.status === ProjectStatus.CREADO) return false;
      if (statusFilter === "REJECTED" && p.status !== ProjectStatus.RECHAZADO_CIERRE) return false;
      if (statusFilter === "APPROVED" && p.status === ProjectStatus.RECHAZADO_CIERRE) return false;
      const projectDate = p.createdDate?.slice(0, 10);
      if (dateFrom && (!projectDate || projectDate < dateFrom)) return false;
      if (dateTo && (!projectDate || projectDate > dateTo)) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, statusFilter, dateFrom, dateTo, query]);
  const selectedProject = revisedProjects.find((p) => p.id === selectedId);

  const columns: Column<Project>[] = [
    {
      key: "id",
      label: "ID",
      width: "6.5rem",
      sortable: true,
      render: (p) => <span className={`font-mono font-bold text-[10px] ${success.text600} whitespace-nowrap`}>{p.id}</span>,
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
      key: "status",
      label: "Estado",
      width: "9rem",
      sortable: true,
      render: (p) => <StatusBadge code={p.status} />,
    },
    {
      key: "documents",
      label: "Adjuntos",
      width: "6rem",
      align: "right",
      render: (p) => <span className="font-mono text-[11px] font-bold text-slate-600">{p.documents?.length ?? 0}</span>,
    },
    {
      key: "rejections",
      label: "Rechazos",
      width: "6rem",
      align: "right",
      sortable: true,
      sortValue: (p) => rejectionCountOf(p.id, auditLogs),
      render: (p) => {
        const count = rejectionCountOf(p.id, auditLogs);
        return count > 0 ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-danger-600">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {count}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-slate-300">—</span>
        );
      },
    },
  ];

  const handleDownload = async (doc: ProjectDocument) => {
    if (!selectedProject) return;
    try {
      await downloadProjectDocument(selectedProject.id, doc, authToken);
    } catch {
      showToast("No se pudo descargar el archivo.", "error");
    }
  };

  return (
    <Card accent="success" className="min-h-0 flex-1 p-0 overflow-hidden flex flex-col" fillHeight>
      <div className="px-6 pt-6 shrink-0">
        <SectionHeader
          icon={<FileStack className="h-5 w-5" />}
          title="Historial de Expedientes"
          description="Consulta el historial completo de expedientes procesados, incluidas correcciones y rechazos."
          color="emerald"
        />
      </div>

      <TableToolbar
        searchId="revised-docs-search"
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por ID, título o ubicación..."
        searchAriaLabel="Buscar expedientes"
        filter={{
          id: "revised-docs-filter-status",
          value: statusFilter,
          onChange: setStatusFilter,
          ariaLabel: "Filtrar por estado",
          options: STATUS_FILTER_OPTIONS,
        }}
        countIcon={<FileStack />}
        filteredCount={revisedProjects.length}
        totalCount={projects.filter((p) => p.status !== ProjectStatus.CREADO).length}
        noun="expediente"
        nounPlural="expedientes"
        viewToggle={{ ...viewToggle, accent: "success" }}
      />

      {/* Rango de fechas: no encaja en las props fijas de TableToolbar (un
          único `filter` select) — se queda como control adicional aparte. */}
      <div className="shrink-0 flex flex-wrap items-center gap-2.5 px-5 py-3 border-b border-slate-100 bg-slate-50/30">
        <input
          id="revised-docs-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="Fecha desde"
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer"
          title="Fecha desde"
        />
        <input
          id="revised-docs-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="Fecha hasta"
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-bold cursor-pointer"
          title="Fecha hasta"
        />
      </div>

      {revisedProjects.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState message="No hay proyectos con documentación ya revisada." />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "table" ? (
            <motion.div
              key="table"
              variants={viewSwitchVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              ref={containerRef}
              className="flex-1 min-h-0 px-6 pb-6 pt-4"
            >
              <Table
                columns={columns}
                data={revisedProjects}
                rowKey={(p) => p.id}
                pageSize={pageSize}
                fillViewport
                stickyHeader
                onRowClick={(p) => setSelectedId(p.id)}
                selectedRowKey={selectedId}
              />
            </motion.div>
          ) : (
            <motion.div key="grid" variants={viewSwitchVariants} initial="hidden" animate="visible" exit="hidden" className="flex-1 min-h-0 px-6 pb-6 pt-4">
              <GridView
                items={revisedProjects}
                rowKey={(p) => p.id}
                renderCard={(p) => renderExpedienteCard(p, rejectionCountOf(p.id, auditLogs))}
                cardAccent={(p) => (rejectionCountOf(p.id, auditLogs) > 0 ? "danger" : undefined)}
                onSelect={(p) => setSelectedId(p.id)}
                selectedKey={selectedId}
                emptyState={<EmptyState message="No hay proyectos que coincidan con los filtros." />}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Modal de documentos del expediente seleccionado ── */}
      <Modal
        isOpen={!!selectedProject}
        onClose={() => setSelectedId("")}
        maxWidth="max-w-3xl"
        icon={<FileStack className="h-5 w-5" />}
        iconColor="emerald"
        badge="Historial de Expedientes"
        title={selectedProject ? `Expediente ${selectedProject.id}` : ""}
        infoLine={selectedProject ? `${selectedProject.title} · ${selectedProject.location}` : ""}
      >
        {selectedProject && (
          <>
            <Tabs
              ariaLabel="Secciones del expediente"
              activeKey={modalTab}
              onChange={(key) => setModalTab(key as ModalTabKey)}
              layoutId="modal-expediente-tabs-indicator"
              fullWidth
              tabs={[
                { key: "detalle", label: "Detalle Expediente" },
                {
                  key: "historial",
                  label: "Historial Iteraciones",
                  count: rejectionCountOf(selectedProject.id, auditLogs) || undefined,
                  showDot: rejectionCountOf(selectedProject.id, auditLogs) > 0,
                },
                { key: "archivos", label: "Archivos", count: selectedProject.documents?.length || undefined },
              ]}
            />
            {/* min-h fija: sin esto el modal crece/decrece de alto entre tabs
                según cuánto contenido tenga cada una, lo que se siente como
                un salto visual al cambiar de pestaña. */}
            <TabPanel activeKey={modalTab} className="mt-4 min-h-90">
              {modalTab === "detalle" && (
                <ExpedienteDetailTab project={selectedProject} rejectionCount={rejectionCountOf(selectedProject.id, auditLogs)} />
              )}
              {modalTab === "historial" && (
                <ProjectIterationsTimeline projectId={selectedProject.id} auditLogs={auditLogs} />
              )}
              {modalTab === "archivos" && (
                <ProjectDocumentsList
                  project={selectedProject}
                  authToken={authToken}
                  auditLogs={auditLogs}
                  onDownload={handleDownload}
                  onPreview={setPreviewDoc}
                />
              )}
            </TabPanel>
          </>
        )}
      </Modal>

      {selectedProject && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          projectId={selectedProject.id}
          document={previewDoc}
          authToken={authToken}
          onDownload={handleDownload}
        />
      )}
    </Card>
  );
}
