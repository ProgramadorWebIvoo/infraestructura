/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Infraestructura / Mantenimiento: creación de peticiones de obra.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Building2, CheckCircle2, Clock, FilePlus2, HardHat } from "lucide-react";
import type { Project, MaterialItem } from "../../types";
import { ProjectStatus } from "../../types";
import { useToast } from "../../components/UI/Toast";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonBlock, SkeletonStats } from "../../components/SkeletonLoader";
import KpiCard from "../../components/UI/KpiCard";
import RequestFormSection from "./components/RequestFormSection";
import MaterialAdderSection from "./components/MaterialAdderSection";
import RequestsTableSection from "./components/RequestsTableSection";

interface InfraestructuraMantenimientoPanelProps {
  onAddProject: (project: Omit<Project, "id" | "createdDate" | "status">) => void;
  projects: Project[];
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  isLoading?: boolean;
}

export type FieldKey = "title" | "location" | "description" | "materials";
export type FieldErrors = Partial<Record<FieldKey, string>>;

export default function InfraestructuraMantenimientoPanel({
  onAddProject,
  projects,
  materialsCatalog,
  isLoading = false,
}: InfraestructuraMantenimientoPanelProps) {
  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"INFRAESTRUCTURA" | "MANTENIMIENTO">("INFRAESTRUCTURA");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // Added materials state
  const [addedMaterials, setAddedMaterials] = useState<Omit<MaterialItem, "id">[]>([]);

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Filtro de etapa compartido entre el pipeline y la tabla
  const [stageKey, setStageKey] = useState("todas");

  const materialsSubtotal = useMemo(
    () => addedMaterials.reduce((sum, m) => sum + m.quantity * m.estimatedUnitPrice, 0),
    [addedMaterials],
  );

  const kpis = useMemo(
    () => ({
      total: projects.length,
      pendingReview: projects.filter((p) => p.status === ProjectStatus.CREADO).length,
      inExecution: projects.filter((p) => p.status === ProjectStatus.EN_EJECUCION).length,
      completed: projects.filter((p) => p.status === ProjectStatus.COMPLETADO_PAGADO).length,
    }),
    [projects],
  );

  if (isLoading) return <InfraestructuraSkeleton />;

  const clearError = (key: FieldKey) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = "El título de la obra o trabajo es obligatorio.";
    if (!location.trim()) errors.location = "La ubicación exacta es obligatoria.";
    if (!description.trim()) errors.description = "Describe el alcance del trabajo a realizar.";
    if (addedMaterials.length === 0) errors.materials = "Agrega al menos un material o servicio a la petición.";
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors = validate();
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      onAddProject({
        title, type, description, location,
        materials: addedMaterials.map((m, index) => ({ id: `m-new-${index}-${Date.now()}`, ...m })),
        estimatedTotal: materialsSubtotal,
      });

      setTitle(""); setDescription(""); setLocation("");
      setAddedMaterials([]);
      showToast("Petición de Infraestructura registrada con éxito y enviada a Cierre de Obra.", "success");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <h1 className="sr-only">Infraestructura / Mantenimiento</h1>

      {/* Header del departamento */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl shadow-sm">
            <Building2 className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Infraestructura / Mantenimiento</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Registre peticiones de obra y dé seguimiento a los insumos requeridos.
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPIs del departamento (operativos, sin exposición financiera agregada) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </motion.div>

      {/* Formulario + materiales (lado a lado) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RequestFormSection
          title={title}
          onTitleChange={(v) => { setTitle(v); clearError("title"); }}
          location={location}
          onLocationChange={(v) => { setLocation(v); clearError("location"); }}
          type={type}
          onTypeChange={setType}
          description={description}
          onDescriptionChange={(v) => { setDescription(v); clearError("description"); }}
          errors={fieldErrors}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />

        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={addedMaterials}
          onAddedMaterialsChange={(materials) => { setAddedMaterials(materials); clearError("materials"); }}
          materialsError={fieldErrors.materials}
        />
      </motion.div>

      {/* Tabla de peticiones con pipeline integrado (ancho completo, consultable) */}
      <motion.div variants={itemVariants}>
        <RequestsTableSection projects={projects} stageKey={stageKey} onStageKeyChange={setStageKey} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function InfraestructuraSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <SkeletonBlock className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-64" />
          <SkeletonBlock className="h-3 w-80" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStats key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  );
}
