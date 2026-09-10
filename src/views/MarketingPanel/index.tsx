/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Marketing: creación y aprobación de piezas publicitarias
 * (impresiones, viniles, pendones, ...). Tabs + TabPanel + altura real de
 * viewport, mismo patrón que ProcuraPanel/InfraestructuraMantenimientoPanel
 * — necesario para que ProyectosTab pueda usar <Table fillViewport>.
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
import ProyectosTab from "./components/ProyectTab";
import ProyectHistoryTab from "./components/ProyectHistoryTab";
import ProyectCreateTab from "./components/ProyectCreateTab";
import type { MarketingProject, MarketingProjectFormInput } from "./types";

type TabKey = "proyectos" | "crear" | "historial";

interface MarketingPanelProps {
  /** Opcional con default [] — así <MarketingPanel /> sigue compilando mientras se conecta useMarketingProjects. */
  projects?: MarketingProject[];
  isLoading?: boolean;
  onView?: (project: MarketingProject) => void;
  /** POST /marketing-projects (+ subida de adjuntos) — a cargo del consumidor. Al resolver, vuelve a la tab "Proyectos". */
  onCreate?: (data: MarketingProjectFormInput, files: File[]) => void | Promise<void>;
  isCreating?: boolean;
}

export default function MarketingPanel({ projects = [], isLoading = false, onView, onCreate, isCreating = false }: MarketingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("proyectos");

  const handleCreate = async (data: MarketingProjectFormInput, files: File[]) => {
    await onCreate?.(data, files);
    setActiveTab("proyectos");
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

  if (isLoading) return <MarketingSkeleton />;

  const tabs = [
    { key: "proyectos", label: "Proyectos", count: projects.length },
    { key: "crear", label: "Crear" },
    { key: "historial", label: "Historial de Proyectos" },
  ];

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
        <KpiPill icon={<FileEdit className="h-3.5 w-3.5" />} label="Borrador" value={kpis.borrador} accent="neutral" />
        <KpiPill icon={<Clock className="h-3.5 w-3.5" />} label="En Revisión" value={kpis.enRevision} accent="warning" />
        <KpiPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Aprobados" value={kpis.aprobado} accent="success" />
        <KpiPill icon={<XCircle className="h-3.5 w-3.5" />} label="Rechazados" value={kpis.rechazado} accent="danger" />
      </motion.div>

      <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
        <TabPanel activeKey={activeTab}>
          {activeTab === "proyectos" && (
            <ProyectosTab projects={projects} isLoading={isLoading} onView={onView} />
          )}
          {activeTab === "crear" && (
            <ProyectCreateTab onSubmit={handleCreate} isSubmitting={isCreating} onCancel={() => setActiveTab("proyectos")} />
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
