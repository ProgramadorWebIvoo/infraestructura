/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de Infraestructura / Mantenimiento: creación de peticiones de obra.
 */

import { useState } from "react";
import { motion } from "motion/react";
import type { Project, MaterialItem } from "../../types";
import { useToast } from "../../components/UI/Toast";
import { containerVariants, itemVariants } from "../../animations";
import { SkeletonCard, SkeletonBlock } from "../../components/SkeletonLoader";
import RequestFormSection from "./RequestFormSection";
import MaterialAdderSection from "./MaterialAdderSection";
import RequestsListSection from "./RequestsListSection";

interface InfraestructuraMantenimientoPanelProps {
  onAddProject: (project: Omit<Project, "id" | "createdDate" | "status">) => void;
  projects: Project[];
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  isLoading?: boolean;
}

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

  // Validation messages
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  if (isLoading) return <InfraestructuraSkeleton />;

  const materialsSubtotal = addedMaterials.reduce((sum, m) => sum + m.quantity * m.estimatedUnitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) { setErrorMsg("El título del proyecto o trabajo es obligatorio."); return; }
    if (!location.trim()) { setErrorMsg("La ubicación exacta es obligatoria."); return; }
    if (!description.trim()) { setErrorMsg("Por favor, proporciona una descripción del trabajo."); return; }
    if (addedMaterials.length === 0) { setErrorMsg("Debes agregar al menos un material o servicio a la petición."); return; }

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
      setErrorMsg("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* Left 2 Columns: Creation Form */}
      <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
        <h1 className="sr-only">Infraestructura / Mantenimiento</h1>
        <RequestFormSection
          title={title}
          onTitleChange={setTitle}
          location={location}
          onLocationChange={setLocation}
          type={type}
          onTypeChange={setType}
          description={description}
          onDescriptionChange={setDescription}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />

        <MaterialAdderSection
          materialsCatalog={materialsCatalog}
          addedMaterials={addedMaterials}
          onAddedMaterialsChange={(materials) => { setAddedMaterials(materials); setErrorMsg(""); }}
          onError={setErrorMsg}
        />
      </motion.div>

      {/* Right Column: Info + Existing Requests */}
      <motion.div variants={itemVariants} className="space-y-6">
        <RequestsListSection projects={projects} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeleton Loader ─── */
function InfraestructuraSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-2xl p-6 space-y-3">
          <SkeletonBlock className="h-4 w-48 bg-slate-700" />
          <SkeletonBlock className="h-3 w-full bg-slate-700" />
          <SkeletonBlock className="h-3 w-5/6 bg-slate-700" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <SkeletonBlock className="h-3 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 border border-slate-100 rounded-xl space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
