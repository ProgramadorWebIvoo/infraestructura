/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado de navegación del wizard de alta de petición — envuelve
 * useRequestForm y agrega únicamente el paso actual y el paso más lejano
 * visitado. useRequestForm sigue siendo el único dueño del estado de
 * campos/materiales/archivos (single writer); este hook no lo duplica.
 */

import { useState } from "react";
import { validateDatosStep, validateMaterialesStep, validateAdjuntosStep, type FieldErrors, type UseRequestFormReturn } from "./useRequestForm";

export const WIZARD_STEPS = ["datos", "materiales", "adjuntos"] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number];

interface UseRequestWizardParams {
  form: UseRequestFormReturn;
}

export function useRequestWizard({ form }: UseRequestWizardParams) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [furthestVisitedIndex, setFurthestVisitedIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState<FieldErrors>({});

  const validateStep = (index: number): FieldErrors => {
    if (index === 0) return validateDatosStep(form);
    if (index === 1) return validateMaterialesStep(form);
    return validateAdjuntosStep(form);
  };

  const goToStep = (index: number) => {
    if (index <= furthestVisitedIndex) {
      setCurrentIndex(index);
      setStepErrors({});
    }
  };

  /** Valida el paso actual y refleja el resultado en stepErrors — usado tanto
   * por goNext como por el submit final en el último paso (que no navega,
   * solo necesita saber si puede proceder y mostrar el error si no). */
  const validateCurrentStep = (): FieldErrors => {
    const errors = validateStep(currentIndex);
    setStepErrors(errors);
    return errors;
  };

  const goNext = () => {
    const errors = validateCurrentStep();
    if (Object.values(errors).some(Boolean)) return;
    const next = Math.min(currentIndex + 1, WIZARD_STEPS.length - 1);
    setCurrentIndex(next);
    setFurthestVisitedIndex((prev) => Math.max(prev, next));
  };

  const goBack = () => {
    setStepErrors({});
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const reset = () => {
    setCurrentIndex(0);
    setFurthestVisitedIndex(0);
    setStepErrors({});
  };

  return {
    steps: WIZARD_STEPS,
    currentIndex,
    furthestVisitedIndex,
    currentStepId: WIZARD_STEPS[currentIndex],
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === WIZARD_STEPS.length - 1,
    stepErrors,
    goToStep,
    goNext,
    goBack,
    reset,
    validateCurrentStep,
  };
}
