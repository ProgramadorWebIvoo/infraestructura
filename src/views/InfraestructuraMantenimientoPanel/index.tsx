/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Infraestructura / Mantenimiento: creación de peticiones de obra.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock, FilePlus2, HardHat, XCircle } from "lucide-react";
import type { AuditLog, Project } from "../../types";
import { ProjectStatus } from "../../types";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonBlock, SkeletonStats, SkeletonGroup, SkeletonGroupItem } from "../../components/SkeletonLoader";
import KpiCard from "../../components/UI/KpiCard";
import RequestWizardCard from "./components/RequestWizardCard";
import RequestsTableSection from "./components/RequestsTableSection";
import RejectedPetitionsSection from "./components/RejectedPetitionsSection";
import { useRequestForm } from "../../hooks/useRequestForm";

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
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  projects: Project[];
  auditLogs: AuditLog[];
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  isLoading?: boolean;
}

export default function InfraestructuraMantenimientoPanel({
  onAddProject,
  onResubmitProject,
  projects,
  auditLogs,
  materialsCatalog,
  isLoading = false,
}: InfraestructuraMantenimientoPanelProps) {
  const form = useRequestForm({ onAddProject });

  // Filtro de etapa compartido entre el pipeline y la tabla
  const [stageKey, setStageKey] = useState("todas");

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

      {/* Columna completa a alto de viewport, igual que Config
          (ProveedoresConfigPanel/MaterialConfigPanel: calc(100vh - 3rem)) —
          los KPIs son shrink-0 y la fila wizard/tabla es flex-1, así el
          espacio restante lo calcula el navegador (no se estima a mano el
          alto de los KPIs, que puede variar por fuente/zoom/breakpoint). */}
      <div className="flex min-h-0 flex-col gap-6" style={{ height: "calc(100vh - 3rem)" }}>
        {/* KPIs del departamento (operativos, sin exposición financiera agregada).
            Excepción intencional a SEMANTIC_COLOR_MAP: 4 categorías con "cyan"
            (en ejecución) sin equivalente entre los 6 roles semánticos disponibles. */}
        <motion.div variants={itemVariants} className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={<FilePlus2 className="h-5 w-5" />} label="Peticiones" accent="text-sky-600" borderAccent="border-l-sky-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent">{kpis.total}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Registradas por el departamento</p>
          </KpiCard>

          <KpiCard icon={<Clock className="h-5 w-5" />} label="Por Revisar" accent="text-amber-500" borderAccent="border-l-amber-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">{kpis.pendingReview}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">En cola de Cierre de Obra</p>
          </KpiCard>

          <KpiCard icon={<HardHat className="h-5 w-5" />} label="En Ejecución" accent="text-cyan-600" borderAccent="border-l-cyan-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-cyan-700 to-cyan-500 bg-clip-text text-transparent">{kpis.inExecution}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Obras activas en campo</p>
          </KpiCard>

          <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completadas" accent="text-emerald-600" borderAccent="border-l-emerald-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">{kpis.completed}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Pagadas y cerradas</p>
          </KpiCard>

          <KpiCard icon={<XCircle className="h-5 w-5" />} label="Rechazadas" accent="text-rose-600" borderAccent="border-l-rose-400">
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-rose-700 to-rose-500 bg-clip-text text-transparent">{kpis.rejected}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Requieren corrección y reenvío</p>
          </KpiCard>
        </motion.div>

        {/* Wizard de alta + tabla de peticiones, lado a lado — comparten el
            alto restante de la columna, y la tabla usa fillViewport para
            ocupar ese alto real (no el alto del wizard vecino: CSS grid
            stretch no puede "recortar" al más alto contra el más bajo). */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="min-h-0 flex flex-col">
            <RequestWizardCard form={form} materialsCatalog={materialsCatalog} />
          </div>
          <div className="min-h-0 flex flex-col">
            <RequestsTableSection projects={projects} stageKey={stageKey} onStageKeyChange={setStageKey} />
          </div>
        </motion.div>
      </div>

      {/* Rechazadas: fuera de la columna de alto fijo (contenido condicional,
          no compite por el presupuesto de viewport del wizard/tabla). Se
          autoculta si no hay ninguna rechazada. */}
      <RejectedPetitionsSection
        projects={projects}
        auditLogs={auditLogs}
        materialsCatalog={materialsCatalog}
        onResubmitProject={onResubmitProject}
      />
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function InfraestructuraSkeleton() {
  return (
    <SkeletonGroup className="space-y-6">
      <SkeletonGroupItem className="flex items-center gap-3.5">
        <SkeletonBlock className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-64" />
          <SkeletonBlock className="h-3 w-80" />
        </div>
      </SkeletonGroupItem>
      <SkeletonGroupItem className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonStats key={i} />
        ))}
      </SkeletonGroupItem>
      <SkeletonGroupItem className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </SkeletonGroupItem>
    </SkeletonGroup>
  );
}
