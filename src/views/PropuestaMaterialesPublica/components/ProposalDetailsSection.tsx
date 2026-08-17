/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Duración estimada + notas generales + envío de la propuesta — extraída de
 * PropuestaMaterialesPublica.
 */

import { Clock, HandCoins, Send } from "lucide-react";
import NumericInput from "../../../components/UI/NumericInput";
import Select from "../../../components/UI/Select";
import { DURATION_UNITS, sanitize, type DurationUnit } from "../types";

interface ProposalDetailsSectionProps {
  estimatedDays: number | "";
  onEstimatedDaysChange: (v: number | "") => void;
  durationUnit: DurationUnit;
  onDurationUnitChange: (v: DurationUnit) => void;
  advancePercent: number | "";
  onAdvancePercentChange: (v: number | "") => void;
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
  generalNotes,
  onGeneralNotesChange,
  isSubmitting,
}: ProposalDetailsSectionProps) {
  return (
    <>
      {/* Estimated duration */}
      <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
          <Clock className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Tiempo estimado de ejecucion</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium mb-4">
          Indique cuanto tiempo estima que tomaria completar esta obra desde el inicio de los trabajos.
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
      </div>

      {/* Advance percent */}
      <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
          <HandCoins className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Anticipo requerido</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium mb-4">
          Indique que porcentaje de anticipo necesita para iniciar el pedido (dejelo vacio si no requiere anticipo).
        </p>
        <div className="flex items-center gap-3 max-w-[10rem]">
          <div className="flex-1">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Porcentaje (%)</label>
            <NumericInput
              value={advancePercent}
              onChange={(v) => onAdvancePercentChange(v === "" ? "" : Math.min(100, v))}
              placeholder="0"
              min={0}
              step="1"
            />
          </div>
        </div>
      </div>

      {/* General notes */}
      <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl shadow-slate-950/30">
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Observaciones generales (opcional)
        </label>
        <textarea
          value={generalNotes}
          onChange={(e) => onGeneralNotesChange(sanitize(e.target.value))}
          rows={3}
          maxLength={1000}
          placeholder="Condiciones de pago, garantias, disponibilidad, etc."
          className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-800 outline-hidden transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? "Enviando propuesta..." : "Enviar propuesta de materiales"}
      </button>
    </>
  );
}
