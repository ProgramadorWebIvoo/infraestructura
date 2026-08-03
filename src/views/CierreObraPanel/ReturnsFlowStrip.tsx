/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fila informativa del flujo de retornos de Cierre de Obra, mostrada a lo
 * ancho del panel debajo de los KPIs. El icono pulsa para captar atención.
 */

import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";

const STEPS = [
  {
    number: "1",
    tone: "bg-sky-50 text-sky-600",
    text: <>Cierre de Obra realiza la cubicación de materiales y planos de ingeniería iniciales.</>,
  },
  {
    number: "2",
    tone: "bg-sky-50 text-sky-600",
    text: <>Al finalizar el trabajo, audita físicamente la obra y certifica si cumple con los estándares estipulados.</>,
  },
  {
    number: "3",
    tone: "bg-amber-50 text-amber-600",
    text: <>Su aprobación final viaja a la Base de Datos para que <strong className="text-slate-700">Finanzas</strong> proceda con la liberación del finiquito.</>,
  },
];

export default function ReturnsFlowStrip() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm border-l-4 border-l-slate-400">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Título + icono pulsing */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="relative inline-flex">
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-xl bg-sky-400/40"
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <span className="relative p-2 bg-sky-50 rounded-xl border border-sky-100">
              <HelpCircle className="h-4 w-4 text-sky-500" />
            </span>
          </span>
          <div>
            <h5 className="font-bold text-slate-800 text-sm">Flujo de Retornos</h5>
            <p className="text-[10px] text-slate-400 font-medium">De acuerdo con los procedimientos operativos de IVOO</p>
          </div>
        </div>

        {/* Pasos */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-md font-mono text-[9px] font-black shrink-0 mt-0.5 ${step.tone}`}>
                {step.number}
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-relaxed">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
