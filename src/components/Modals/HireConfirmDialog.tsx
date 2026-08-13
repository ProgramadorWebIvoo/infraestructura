/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Confirmación de adjudicación de contratista — 4 variantes según si la
 * oferta seleccionada excede el anticipo máximo configurado y/o el semáforo
 * de ejecución presupuestaria está en naranja/rojo: normal, solo anticipo,
 * solo semáforo, o ambos combinados.
 */

import { AlertTriangle, CheckCircle, Gauge, HandCoins, ShieldCheck } from "lucide-react";
import Modal from "../UI/Modal";
import Spinner from "../UI/Spinner";
import { SEMAPHORE_COLORS, type SemaphoreLevel } from "../../hooks/useBudgetSemaphore";

interface HireConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  contractorName: string;
  advancePercent: number;
  maxAdvancePercent: number;
  executedPct: number;
  semaphoreLevel: SemaphoreLevel;
}

export default function HireConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  contractorName,
  advancePercent,
  maxAdvancePercent,
  executedPct,
  semaphoreLevel,
}: HireConfirmDialogProps) {
  const exceedsAdvance = advancePercent > maxAdvancePercent;
  const budgetAtRisk = semaphoreLevel === "naranja" || semaphoreLevel === "rojo";
  const semaphoreColors = SEMAPHORE_COLORS[semaphoreLevel];

  const hasWarning = exceedsAdvance || budgetAtRisk;
  const iconColor = hasWarning ? "amber" : "sky";
  const badge = hasWarning ? "Confirmación requerida" : "Confirmación";
  const Icon = hasWarning ? AlertTriangle : CheckCircle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      icon={<Icon className="h-5 w-5" />}
      iconColor={iconColor}
      badge={badge}
      title="Adjudicar Contratista"
      closeDisabled={isLoading}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`cursor-pointer px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2 ${
              hasWarning ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500" : "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500"
            }`}
          >
            {isLoading && <Spinner data-testid="spinner" />}
            {isLoading ? "Procesando..." : "Confirmar adjudicación"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          ¿Estás seguro de adjudicar el contrato a <strong>"{contractorName}"</strong>? Esta acción seleccionará a
          este contratista como ganador y enviará el proyecto a Finanzas para liberación del anticipo.
        </p>

        {exceedsAdvance && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <HandCoins className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Anticipo por encima del máximo configurado.</strong> Esta oferta pacta un anticipo de{" "}
              <strong>{advancePercent}%</strong>, superando el máximo permitido en CONFIG APP ({maxAdvancePercent}%).
            </p>
          </div>
        )}

        {budgetAtRisk && (
          <div className={`flex gap-2.5 rounded-xl border p-3.5 ${semaphoreColors.bg}`}>
            <Gauge className={`h-4 w-4 shrink-0 mt-0.5 ${semaphoreColors.text}`} />
            <p className={`text-xs leading-relaxed ${semaphoreColors.text}`}>
              <strong>Semáforo presupuestario en {semaphoreColors.label.toLowerCase()}.</strong> Esta oferta
              representa el <strong>{Math.round(executedPct)}%</strong> de la inversión autorizada.
            </p>
          </div>
        )}

        {!hasWarning && (
          <div className="flex gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-3.5">
            <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-800 leading-relaxed">
              Anticipo y presupuesto dentro de los parámetros configurados.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
