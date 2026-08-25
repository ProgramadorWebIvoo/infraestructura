/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Infraestructura / Mantenimiento: creación de peticiones de obra.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Clock, FilePlus2, HardHat } from "lucide-react";
import type { AuditLog, Project, ProjectDocument } from "../../types";
import { ProjectStatus } from "../../types";
import { containerVariants, itemVariants, springs } from "../../animations";
import { SkeletonCard, SkeletonBlock, SkeletonGroup, SkeletonGroupItem } from "../../components/SkeletonLoader";
import KpiPill from "../../components/UI/KpiPill";
import Tabs from "../../components/UI/Tabs";
import TabPanel from "../../components/UI/TabPanel";
import RequestWizardCard from "./components/RequestWizardCard";
import RequestsTableSection from "./components/RequestsTableSection";
import RejectedPetitionsSection from "./components/RejectedPetitionsSection";
import RejectedWarningLabel from "./components/RejectedWarningLabel";
import { useRequestForm } from "../../hooks/useRequestForm";

type TabKey = "crear" | "expedientes" | "rechazadas";

export type { FieldKey, FieldErrors } from "../../hooks/useRequestForm";

interface InfraestructuraMantenimientoPanelProps {
  onAddProject: (
    project: Omit<Project, "id" | "createdDate" | "status">,
    files: { photos: File[]; documents: File[]; plans: File[] },
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onResubmitProject: (
    projectId: string,
    project: Omit<Project, "id" | "createdDate" | "status" | "type">,
    files: { photos: File[]; documents: File[]; plans: File[] },
    existingDocuments: ProjectDocument[],
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  onDeleteDocument: (projectId: string, documentId: number) => Promise<void>;
  projects: Project[];
  auditLogs: AuditLog[];
  authToken: string;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  isLoading?: boolean;
}

export default function InfraestructuraMantenimientoPanel({
  onAddProject,
  onResubmitProject,
  onDeleteDocument,
  projects,
  auditLogs,
  authToken,
  materialsCatalog,
  isLoading = false,
}: InfraestructuraMantenimientoPanelProps) {
  const form = useRequestForm({ onAddProject });

  // Filtro de etapa compartido entre el pipeline y la tabla
  const [stageKey, setStageKey] = useState("todas");
  const [activeTab, setActiveTab] = useState<TabKey>("crear");

  const kpis = useMemo(
    () => ({
      total: projects.length,
      pendingReview: projects.filter((p) => p.status === ProjectStatus.CREADO).length,
      inExecution: projects.filter((p) => p.status === ProjectStatus.EN_EJECUCION).length,
      completed: projects.filter((p) => p.status === ProjectStatus.COMPLETADO_PAGADO).length,
      rejected: projects.filter((p) => p.status === ProjectStatus.RECHAZADO_CIERRE).length,
    }),
    [projects],
  );

  if (isLoading) return <InfraestructuraSkeleton />;

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Infraestructura / Mantenimiento</h1>

      {/* Columna a alto de viewport, igual que Config
          (ProveedoresConfigPanel/MaterialConfigPanel: calc(100vh - 3rem)) —
          las tabs/KPIs son shrink-0 y el panel de tab activa es flex-1.
          Height real (no maxHeight): RequestsTableSection y
          RejectedPetitionsSection usan Table fillViewport, que necesita
          h-full/flex-1 min-h-0 en cascada desde un ancestro con altura
          computable de verdad — con maxHeight el contenedor colapsa a
          "auto" y la tabla pierde su scroll interno. Sin overflow-y-auto
          en esta columna: en ciertos zooms el contenido calzaba casi exacto
          al alto disponible y el navegador oscilaba mostrando/ocultando la
          scrollbar — cada tabla maneja su propio scroll interno (Table
          fillViewport), no la columna entera. */}
      <div className="flex min-h-0 flex-col gap-4" style={{ height: "calc(100vh - 3rem)" }}>
        {/* Tabs primero — barra de navegación principal de la vista, full
            width y prominente para que el usuario nunca dude de dónde
            está parado ni de qué otras secciones tiene a un click. */}
        <motion.div variants={itemVariants} className="shrink-0">
          <Tabs
            ariaLabel="Secciones de Infraestructura"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            fullWidth
            tabs={[
              { key: "crear", label: "Crear" },
              { key: "expedientes", label: "Expedientes", count: kpis.total },
              { key: "rechazadas", label: "Rechazadas", count: kpis.rejected, showDot: kpis.rejected > 0 && activeTab !== "rechazadas" },
            ]}
          />
        </motion.div>

        {/* KPIs del departamento en formato compacto tipo pill — contexto
            secundario debajo de las tabs, siempre los mismos 4 sin importar
            la pestaña activa. Excepción intencional a SEMANTIC_COLOR_MAP:
            "cyan" (en ejecución) sin equivalente entre los 6 roles
            semánticos disponibles, así que se usa el accent info más cercano. */}
        <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap gap-2">
          <KpiPill icon={<FilePlus2 className="h-3.5 w-3.5" />} label="Peticiones" value={kpis.total} accent="brand" />
          <KpiPill icon={<Clock className="h-3.5 w-3.5" />} label="Por Revisar" value={kpis.pendingReview} accent="warning" />
          <KpiPill icon={<HardHat className="h-3.5 w-3.5" />} label="En Ejecución" value={kpis.inExecution} accent="info" />
          <KpiPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completadas" value={kpis.completed} accent="success" />
        </motion.div>

        <AnimatePresence>
          {kpis.rejected > 0 && <RejectedWarningLabel key="rejected-warning" count={kpis.rejected} />}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
          <TabPanel activeKey={activeTab}>
            {activeTab === "crear" && <RequestWizardCard form={form} materialsCatalog={materialsCatalog} />}
            {activeTab === "expedientes" && (
              <RequestsTableSection projects={projects} stageKey={stageKey} onStageKeyChange={setStageKey} />
            )}
            {activeTab === "rechazadas" && (
              <RejectedPetitionsSection
                projects={projects}
                auditLogs={auditLogs}
                authToken={authToken}
                materialsCatalog={materialsCatalog}
                onResubmitProject={onResubmitProject}
                onDeleteDocument={onDeleteDocument}
              />
            )}
          </TabPanel>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function InfraestructuraSkeleton() {
  return (
    <SkeletonGroup className="space-y-4">
      <SkeletonGroupItem className="flex items-center gap-3.5">
        <SkeletonBlock className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-64" />
          <SkeletonBlock className="h-3 w-80" />
        </div>
      </SkeletonGroupItem>
      <SkeletonGroupItem>
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
      </SkeletonGroupItem>
      <SkeletonGroupItem className="flex gap-2">
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
      </SkeletonGroupItem>
      <SkeletonGroupItem>
        <SkeletonCard />
      </SkeletonGroupItem>
    </SkeletonGroup>
  );
}
