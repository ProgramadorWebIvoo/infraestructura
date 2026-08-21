/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Paso 2 del wizard de alta de petición: elección de materiales (catálogo
 * en lote o personalizado) y la lista de agregados. Sin Card/SectionHeader
 * propios — contenido puro de paso, montado dentro de RequestWizardCard.
 * Es el único "writer" de `addedMaterials` — los hijos (CatalogPicker,
 * CustomMaterialForm, AddedMaterialsTable) solo emiten intención.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Info, Package } from "lucide-react";
import type { MaterialItem } from "../../../types";
import SegmentedControl from "../../../components/UI/SegmentedControl";
import AlertBanner from "../../../components/UI/AlertBanner";
import { useToast } from "../../../components/UI/Toast";
import { bannerVariants, springs } from "../../../animations";
import CatalogPicker from "./CatalogPicker";
import CustomMaterialForm from "./CustomMaterialForm";
import AddedMaterialsTable from "./AddedMaterialsTable";
import MaterialCharacteristicsEditModal from "./MaterialCharacteristicsEditModal";

interface MaterialAdderSectionProps {
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
  addedMaterials: Omit<MaterialItem, "id">[];
  onAddedMaterialsChange: (materials: Omit<MaterialItem, "id">[]) => void;
  reviewedMaterialIndexes: Set<number>;
  onMaterialReviewed: (index: number) => void;
  materialsSubtotal: number;
  /** Error de validación del paso (avanzar sin materiales). */
  materialsError?: string;
}

export default function MaterialAdderSection({
  materialsCatalog,
  addedMaterials,
  onAddedMaterialsChange,
  reviewedMaterialIndexes,
  onMaterialReviewed,
  materialsSubtotal,
  materialsError,
}: MaterialAdderSectionProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">(
    materialsCatalog.length === 0 ? "custom" : "catalog",
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { showToast } = useToast();

  // Si el catálogo está vacío, el agregado personalizado es la única vía útil.
  useEffect(() => {
    if (materialsCatalog.length === 0 && activeTab !== "custom") setActiveTab("custom");
  }, [materialsCatalog.length, activeTab]);

  const handleChecklistConfirm = (items: { catalogIndex: number; quantity: number }[]) => {
    const newMaterials: Omit<MaterialItem, "id">[] = items.map(({ catalogIndex, quantity }) => {
      const cat = materialsCatalog[catalogIndex];
      // Condición default "NUEVO": el checklist del catálogo no tiene
      // selector propio — se ajusta luego desde "Editar detalles".
      return { name: cat.name, quantity, unit: cat.unit, estimatedUnitPrice: cat.estimatedUnitPrice, condition: "NUEVO" as const };
    });
    onAddedMaterialsChange([...addedMaterials, ...newMaterials]);
    showToast(
      `${items.length} material${items.length > 1 ? "es" : ""} agregado${items.length > 1 ? "s" : ""} al requerimiento.`,
      "success",
    );
  };

  const handleAddCustomMaterial = (material: Omit<MaterialItem, "id">) => {
    onAddedMaterialsChange([...addedMaterials, material]);
  };

  const handleRemoveMaterial = (index: number) => {
    onAddedMaterialsChange(addedMaterials.filter((_, i) => i !== index));
  };

  const handleSaveCharacteristics = (index: number, characteristics: Partial<MaterialItem>) => {
    onAddedMaterialsChange(
      addedMaterials.map((m, i) => (i === index ? { ...m, ...characteristics } : m)),
    );
    onMaterialReviewed(index);
    setEditingIndex(null);
  };

  const unreviewedCount = addedMaterials.filter((_, i) => !reviewedMaterialIndexes.has(i)).length;

  return (
    <div>
      <AnimatePresence>
        {materialsError && (
          <motion.div variants={bannerVariants} initial="hidden" animate="visible" exit="exit">
            <AlertBanner type="error" message={materialsError} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {materialsCatalog.length === 0 && (
          <motion.div variants={bannerVariants} initial="hidden" animate="visible" exit="exit">
            <AlertBanner
              type="info"
              message="El catálogo IVOO está vacío. Usa la pestaña Personalizado para cargar el material o servicio."
              icon={<Package className="h-4 w-4 shrink-0" />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-5">
        <SegmentedControl
          variant="pill"
          accent="success"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "catalog", label: "Catálogo IVOO" },
            { value: "custom", label: "Personalizado" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={springs.snappy}
        >
          {activeTab === "catalog" ? (
            <CatalogPicker materialsCatalog={materialsCatalog} onConfirm={handleChecklistConfirm} />
          ) : (
            <CustomMaterialForm onAdd={handleAddCustomMaterial} />
          )}
        </motion.div>
      </AnimatePresence>

      <AddedMaterialsTable
        materials={addedMaterials}
        onRemove={handleRemoveMaterial}
        onEditRequest={setEditingIndex}
        reviewedIndexes={reviewedMaterialIndexes}
        subtotal={materialsSubtotal}
      />

      <AnimatePresence>
        {unreviewedCount > 0 && (
          <motion.div variants={bannerVariants} initial="hidden" animate="visible" exit="exit" className="mt-3">
            <AlertBanner
              type="info"
              message={`${unreviewedCount} material${unreviewedCount > 1 ? "es" : ""} sin revisar sus características (condición, garantía, etc.). Es opcional, pero recomendado antes de enviar.`}
              icon={<Info className="h-4 w-4 shrink-0" />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {editingIndex !== null && (
        <MaterialCharacteristicsEditModal
          isOpen
          material={addedMaterials[editingIndex]}
          onClose={() => setEditingIndex(null)}
          onSave={(characteristics) => handleSaveCharacteristics(editingIndex, characteristics)}
        />
      )}
    </div>
  );
}
