/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Marketing: creación y aprobación de piezas publicitarias
 * (impresiones, viniles, pendones, ...). Tabs + TabPanel + altura real de
 * viewport, mismo patrón que ProcuraPanel/InfraestructuraMantenimientoPanel
 * — necesario para que ProyectHistoryTab pueda usar <Table fillViewport>.
 *
 * Sin tab de listado propio: el listado en vivo de proyectos ahora vive en
 * PROCURA (flujo alterno unido). Este panel conserva Crear e Historial.
 *
 * Presentacional: recibe `projects` ya resueltos del backend
 * (GET /marketing-projects) — el hook que los trae (useMarketingProjects)
 * y los handlers de creación/aprobación/rechazo quedan a cargo del
 * consumidor.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock, FileEdit, XCircle } from "lucide-react";
import { containerVariants, itemVariants } from "@/animations";
import { SkeletonCard, SkeletonBlock } from "@/components/SkeletonLoader";
import Tabs from "@/components/UI/Tabs";
import TabPanel from "@/components/UI/TabPanel";
import KpiPill from "@/components/UI/KpiPill";
import ProyectHistoryTab from "./components/ProyectHistoryTab";
import ProyectCreateTab from "./components/ProyectCreateTab";
import type { MarketingProject, MarketingProjectFormInput } from "./types";
import { useTabAccess, useSyncActiveTab } from "@/hooks/useTabAccess";

type TabKey = "crear" | "historial";

interface MarketingPanelProps {
  /** Opcional con default [] — así <MarketingPanel /> sigue compilando mientras se conecta useMarketingProjects. */
  projects?: MarketingProject[];
  /** Opcional con default "" — solo se usa para resolver tabs dinámicas (GET /auth/tabs); sin token, todas las tabs quedan visibles. */
  authToken?: string;
  isLoading?: boolean;
  onView?: (project: MarketingProject) => void;
  /** POST /marketing-projects (+ subida de adjuntos) — a cargo del consumidor. Al resolver, vuelve a la tab "Proyectos". */
  onCreate?: (data: MarketingProjectFormInput, files: File[]) => void | Promise<void>;
  isCreating?: boolean;
}

export default function MarketingPanel({ projects = [], authToken = "", isLoading = false, onView, onCreate, isCreating = false }: MarketingPanelProps) {
  const { filterTabs, isLoadingTabs } = useTabAccess(authToken);
  const [activeTab, setActiveTab] = useState<TabKey>("historial");

  const handleCreate = async (data: MarketingProjectFormInput, files: File[]) => {
    await onCreate?.(data, files);
    setActiveTab("historial");
  };

  const kpis = useMemo(
    () => ({
      borrador: projects.filter((p) => p.status === "BORRADOR").length,
      enRevision: projects.filter((p) => p.status === "EN_REVISION").length,
      aprobado: projects.filter((p) => p.status === "APROBADO").length,
      rechazado: projects.filter((p) => p.status === "RECHAZADO").length,
    }),
    [projects],
  );

  const tabs = filterTabs("/marketing", [
    { key: "crear", label: "Crear" },
    { key: "historial", label: "Historial de Proyectos" },
  ]);
  useSyncActiveTab(tabs, activeTab, setActiveTab);

  if (isLoading || isLoadingTabs) return <MarketingSkeleton />;

  return (
    <motion.div
      className="flex min-h-0 flex-col gap-4"
      style={{ height: "calc(100vh - 3rem)" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h1 className="sr-only">Marketing</h1>

      <motion.div variants={itemVariants} className="shrink-0">
        <Tabs
          tabs={tabs}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          ariaLabel="Navegacion de Marketing"
          fullWidth
        />
      </motion.div>

      <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap gap-2">
        <KpiPill icon={<FileEdit className="h-3.5 w-3.5" />} label="Borrador" value={kpis.borrador} accent="neutral" tooltip="Proyectos de piezas publicitarias en edición, aún no enviados a revisión." />
        <KpiPill icon={<Clock className="h-3.5 w-3.5" />} label="En Revisión" value={kpis.enRevision} accent="warning" tooltip="Proyectos enviados y pendientes de aprobación." />
        <KpiPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Aprobados" value={kpis.aprobado} accent="success" tooltip="Proyectos ya aprobados y listos para producción/publicación." />
        <KpiPill icon={<XCircle className="h-3.5 w-3.5" />} label="Rechazados" value={kpis.rechazado} accent="danger" tooltip="Proyectos devueltos con observaciones para corrección." />
      </motion.div>

      <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
        <TabPanel activeKey={activeTab}>
          {activeTab === "crear" && (
            <ProyectCreateTab onSubmit={handleCreate} isSubmitting={isCreating} onCancel={() => setActiveTab("historial")} />
          )}
          {activeTab === "historial" && (
            <ProyectHistoryTab projects={projects} isLoading={isLoading} onView={onView} />
          )}
        </TabPanel>
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function MarketingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <SkeletonBlock className="h-11 w-40 rounded-2xl" />
        <SkeletonBlock className="h-11 w-40 rounded-2xl" />
        <SkeletonBlock className="h-11 w-40 rounded-2xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
        <SkeletonBlock className="h-8 w-32 rounded-full" />
      </div>
      <SkeletonCard />
    </div>
  );
}
