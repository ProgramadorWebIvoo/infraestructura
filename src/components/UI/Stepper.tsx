/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Indicador de pasos horizontal para formularios tipo wizard. Puro y
 * controlado por props — no sabe nada de validación de negocio, eso vive
 * en el hook del wizard que lo consume (ej. useRequestWizard).
 */

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { springs } from "../../animations";

export interface StepDefinition {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepDefinition[];
  currentIndex: number;
  /** Índice más lejano ya visitado — habilita click para retroceder hasta ahí. */
  furthestVisitedIndex: number;
  onStepClick: (index: number) => void;
  ariaLabel?: string;
}

export default function Stepper({ steps, currentIndex, furthestVisitedIndex, onStepClick, ariaLabel = "Pasos" }: StepperProps) {
  return (
    <ol aria-label={ariaLabel} className="flex items-start">
      {steps.map((step, index) => {
        const isCompleted = index < furthestVisitedIndex;
        const isCurrent = index === currentIndex;
        const isClickable = index <= furthestVisitedIndex && index !== currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(index)}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-2.5 text-left ${isClickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <motion.span
                animate={{
                  scale: isCurrent ? 1.08 : 1,
                }}
                transition={springs.snappy}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black transition-colors duration-200 ${
                  isCurrent
                    ? "border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : isCompleted
                      ? "border-success-500 bg-success-50 text-success-600"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </motion.span>
              <span className="hidden sm:block">
                <span
                  className={`block text-xs font-bold ${
                    isCurrent ? "text-brand-700" : isCompleted ? "text-success-700" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-[10px] font-medium text-slate-400">{step.description}</span>
                )}
              </span>
            </button>
            {!isLast && (
              <div
                className={`mx-3 h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                  isCompleted ? "bg-success-300" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
