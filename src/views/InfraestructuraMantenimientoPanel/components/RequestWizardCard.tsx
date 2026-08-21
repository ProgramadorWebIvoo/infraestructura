/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card única de alta de petición, por pasos (wizard) — reemplaza las 3
 * cards separadas (datos / materiales / adjuntos) que antes se mostraban
 * simultáneamente. Orquestador delgado: delega estado de campos en
 * useRequestForm y navegación en useRequestWizard, sin duplicar ninguno.
 */

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, FilePlus2, Send } from "lucide-react";
import Card from "../../../components/UI/Card";
import SectionHeader from "../../../components/UI/SectionHeader";
import Stepper, { type StepDefinition } from "../../../components/UI/Stepper";
import Button from "../../../components/UI/Button";
import { springs } from "../../../animations";
import type { UseRequestFormReturn } from "../../../hooks/useRequestForm";
import { useRequestWizard } from "../../../hooks/useRequestWizard";
import RequestFormSection from "./RequestFormSection";
import MaterialAdderSection from "./MaterialAdderSection";
import AttachmentsSection from "./AttachmentsSection";

const STEP_DEFINITIONS: StepDefinition[] = [
  { id: "datos", label: "Datos de la Obra", description: "Título, ubicación y alcance" },
  { id: "materiales", label: "Materiales", description: "Catálogo o personalizado" },
  { id: "adjuntos", label: "Adjuntos", description: "Fotos, documentos y planos" },
];

interface RequestWizardCardProps {
  form: UseRequestFormReturn;
  materialsCatalog: { name: string; unit: string; estimatedUnitPrice: number }[];
}

export default function RequestWizardCard({ form, materialsCatalog }: RequestWizardCardProps) {
  const wizard = useRequestWizard({ form });

  const handleSubmit = async () => {
    // form.handleSubmit ya valida todo (incluyendo adjuntos) y setea
    // form.fieldErrors, pero eso solo se refleja en el paso "datos" — validar
    // el paso actual (adjuntos) aquí hace que el error se muestre también
    // ahí si falta algo, sin duplicar el mensaje ni navegar innecesariamente.
    if (Object.values(wizard.validateCurrentStep()).some(Boolean)) return;
    await form.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    wizard.reset();
  };

  return (
    <Card accent="brand" hoverable={false} fillHeight>
      <div className="shrink-0">
        <SectionHeader
          icon={<FilePlus2 className="h-5 w-5" />}
          title={form.isEditMode ? "Corregir y Reenviar Petición" : "Crear Nueva Petición de Obra / Trabajo"}
          description={
            form.isEditMode
              ? "Corrija lo indicado por Cierre de Obra y reenvíe la petición para una nueva evaluación."
              : "Formule su requerimiento y defina los materiales necesarios para iniciar el flujo de aprobación."
          }
          color="sky"
        />

        <div className="mt-2 mb-6">
          <Stepper
            steps={STEP_DEFINITIONS}
            currentIndex={wizard.currentIndex}
            furthestVisitedIndex={wizard.furthestVisitedIndex}
            onStepClick={wizard.goToStep}
            ariaLabel="Pasos de la petición"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={wizard.currentStepId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={springs.snappy}
          className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1"
        >
          {wizard.currentStepId === "datos" && (
            <RequestFormSection
              title={form.title}
              onTitleChange={form.setTitle}
              location={form.location}
              onLocationChange={form.setLocation}
              type={form.type}
              onTypeChange={form.setType}
              description={form.description}
              onDescriptionChange={form.setDescription}
              errors={{ ...wizard.stepErrors, ...form.fieldErrors }}
              typeReadOnly={form.isEditMode}
            />
          )}

          {wizard.currentStepId === "materiales" && (
            <MaterialAdderSection
              materialsCatalog={materialsCatalog}
              addedMaterials={form.addedMaterials}
              onAddedMaterialsChange={form.setAddedMaterials}
              reviewedMaterialIndexes={form.reviewedMaterialIndexes}
              onMaterialReviewed={form.markMaterialReviewed}
              materialsSubtotal={form.materialsSubtotal}
              materialsError={wizard.stepErrors.materials ?? form.fieldErrors.materials}
            />
          )}

          {wizard.currentStepId === "adjuntos" && (
            <AttachmentsSection
              photoFiles={form.photoFiles}
              onPhotoFilesChange={form.setPhotoFiles}
              documentFiles={form.documentFiles}
              onDocumentFilesChange={form.setDocumentFiles}
              planFiles={form.planFiles}
              onPlanFilesChange={form.setPlanFiles}
              error={wizard.stepErrors.attachments ?? form.fieldErrors.attachments}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="shrink-0 flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
        <Button
          type="button"
          variant="secondary"
          onClick={wizard.goBack}
          disabled={wizard.isFirstStep}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Atrás
        </Button>

        {wizard.isLastStep ? (
          <Button
            id="btn-submit-project"
            type="button"
            variant="primary"
            colorScheme="sky"
            disabled={form.isSubmitting}
            isLoading={form.isSubmitting}
            icon={<Send className="h-4 w-4" />}
            onClick={handleSubmit}
          >
            {form.isSubmitting
              ? "Enviando..."
              : form.isEditMode
                ? "Reenviar Petición a Cierre de Obra"
                : "Enviar Petición a Cierre de Obra"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            colorScheme="sky"
            onClick={wizard.goNext}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Siguiente
          </Button>
        )}
      </div>
    </Card>
  );
}
