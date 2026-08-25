/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Confirmación de adjudicación de contratista. El gauge circular de
 * ejecución presupuestaria siempre se muestra (contexto); la alerta de
 * anticipo excedido es la única condicional — se suma cuando la oferta
 * pacta un anticipo por encima del máximo configurado en CONFIG APP.
 */

import { AlertTriangle, CheckCircle, Gauge, HandCoins, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import Modal from "../UI/Modal";
import Button from "../UI/Button";
import { SEMANTIC_COLOR_MAP } from "../UI/colorTokens";
import { SEMAPHORE_COLORS, type SemaphoreLevel } from "../../hooks/useBudgetSemaphore";
import { containerVariants, itemVariants } from "../../animations";

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
  const warning = SEMANTIC_COLOR_MAP.warning;
  const brand = SEMANTIC_COLOR_MAP.brand;

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
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            colorScheme={hasWarning ? "amber" : "sky"}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
            icon={<ShieldCheck className="h-4 w-4" />}
          >
            {isLoading ? "Procesando..." : "Confirmar adjudicación"}
          </Button>
        </div>
      }
    >
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
        <motion.p variants={itemVariants} className="text-sm text-slate-600 leading-relaxed">
          ¿Estás seguro de adjudicar el contrato a <strong className="text-slate-800">"{contractorName}"</strong>? Esta acción seleccionará a
          este contratista como ganador y enviará el proyecto a Finanzas para liberación del anticipo.
        </motion.p>

        {/* Semáforo de ejecución presupuestaria — gauge circular en vez de
            solo texto+color, para que el % de ejecución se lea de un
            vistazo sin tener que parsear la oración. */}
        <motion.div variants={itemVariants} className={`flex items-center gap-4 rounded-2xl border p-4 ${budgetAtRisk ? semaphoreColors.bg : `${brand.border100} ${brand.bg50}`}`}>
          <div className="relative shrink-0 h-14 w-14">
            <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" className="stroke-white" />
              <motion.circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className={budgetAtRisk ? semaphoreColors.text : brand.icon500}
                stroke="currentColor"
                strokeDasharray={2 * Math.PI * 16}
                initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - Math.min(100, executedPct) / 100) }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-mono font-black text-xs ${budgetAtRisk ? semaphoreColors.text : brand.text700}`}>
                {Math.round(executedPct)}%
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${budgetAtRisk ? semaphoreColors.text : "text-slate-500"}`}>
              <Gauge className="h-3.5 w-3.5 shrink-0" />
              Ejecución presupuestaria: {semaphoreColors.label}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              Esta oferta representa el <strong className="text-slate-700">{Math.round(executedPct)}%</strong> de la inversión autorizada.
            </p>
          </div>
        </motion.div>

        {exceedsAdvance && (
          <motion.div variants={itemVariants} className={`flex gap-2.5 rounded-xl border p-3.5 ${warning.border100} ${warning.bg50}`}>
            <HandCoins className={`h-4 w-4 shrink-0 mt-0.5 ${warning.icon500}`} />
            <p className={`text-xs leading-relaxed ${warning.text700}`}>
              <strong>Anticipo por encima del máximo configurado.</strong> Esta oferta pacta un anticipo de{" "}
              <strong>{advancePercent}%</strong>, superando el máximo permitido en CONFIG APP ({maxAdvancePercent}%).
            </p>
          </motion.div>
        )}

        {!hasWarning && (
          <motion.div variants={itemVariants} className={`flex gap-2.5 rounded-xl border p-3.5 ${brand.border100} ${brand.bg50}`}>
            <ShieldCheck className={`h-4 w-4 shrink-0 mt-0.5 ${brand.icon500}`} />
            <p className={`text-xs leading-relaxed ${brand.text700}`}>
              Anticipo y presupuesto dentro de los parámetros configurados.
            </p>
          </motion.div>
        )}
      </motion.div>
    </Modal>
  );
}
