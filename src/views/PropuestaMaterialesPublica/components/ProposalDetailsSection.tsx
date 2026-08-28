/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Duración estimada + notas generales + envío de la propuesta — extraída de
 * PropuestaMaterialesPublica.
 */

import { motion } from "motion/react";
import { Clock, HandCoins, Loader2, Send } from "lucide-react";
import NumericInput from "../../../components/UI/NumericInput";
import Select from "../../../components/UI/Select";
import { itemVariants } from "../../../animations";
import { DURATION_UNITS, sanitize, type DurationUnit } from "../types";

interface ProposalDetailsSectionProps {
  estimatedDays: number | "";
  onEstimatedDaysChange: (v: number | "") => void;
  durationUnit: DurationUnit;
  onDurationUnitChange: (v: DurationUnit) => void;
  advancePercent: number | "";
  onAdvancePercentChange: (v: number | "") => void;
  laborCost: number | "";
  onLaborCostChange: (v: number | "") => void;
  currencyCode: string;
  generalNotes: string;
  onGeneralNotesChange: (v: string) => void;
  isSubmitting: boolean;
}

export default function ProposalDetailsSection({
  estimatedDays,
  onEstimatedDaysChange,
  durationUnit,
  onDurationUnitChange,
  advancePercent,
  onAdvancePercentChange,
  laborCost,
  onLaborCostChange,
  currencyCode,
  generalNotes,
  onGeneralNotesChange,
  isSubmitting,
}: ProposalDetailsSectionProps) {
  return (
    <>
      {/* Estimated duration */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Tiempo estimado de ejecución</h3>
        </div>
        <p className="mb-4 text-xs font-medium text-slate-500">
          Indique cuánto tiempo estima que tomaría completar esta obra desde el inicio de los trabajos.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cantidad</label>
            <NumericInput
              value={estimatedDays}
              onChange={onEstimatedDaysChange}
              placeholder="0"
              min={1}
            />
          </div>
          <div className="w-36">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Unidad</label>
            <Select
              value={durationUnit}
              onChange={(v) => onDurationUnitChange(v as DurationUnit)}
              options={DURATION_UNITS}
            />
          </div>
        </div>
      </motion.div>

      {/* Advance percent + labor cost */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
          <HandCoins className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Anticipo y mano de obra</h3>
        </div>
        <p className="mb-4 text-xs font-medium text-slate-500">
          Ambos campos son opcionales — déjelos vacíos si no requiere anticipo o no cotiza mano de obra por separado.
        </p>
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-32">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Anticipo (%)</label>
            <NumericInput
              value={advancePercent}
              onChange={(v) => onAdvancePercentChange(v === "" ? "" : Math.min(100, v))}
              placeholder="0"
              min={0}
              step="1"
            />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Mano de obra ({currencyCode || "—"})
            </label>
            <NumericInput value={laborCost} onChange={onLaborCostChange} placeholder="0.00" min={0} />
          </div>
        </div>
      </motion.div>

      {/* General notes */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Observaciones generales (opcional)
        </label>
        <textarea
          value={generalNotes}
          onChange={(e) => onGeneralNotesChange(sanitize(e.target.value))}
          rows={3}
          maxLength={1000}
          placeholder="Condiciones de pago, garantías, disponibilidad, etc."
          className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
      </motion.div>

      <motion.button
        variants={itemVariants}
        type="submit"
        disabled={isSubmitting}
        whileHover={!isSubmitting ? { scale: 1.008, y: -1 } : undefined}
        whileTap={!isSubmitting ? { scale: 0.99 } : undefined}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition-shadow duration-200 hover:shadow-xl hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!isSubmitting && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.35)_50%,transparent_60%)] bg-[length:220%_100%]"
            animate={{ backgroundPosition: ["150% 0%", "-50% 0%"] }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
          />
        )}
        <span className="relative z-10 inline-flex items-center gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isSubmitting ? "Enviando propuesta..." : "Enviar propuesta de materiales"}
        </span>
      </motion.button>
    </>
  );
}
