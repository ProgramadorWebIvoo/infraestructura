/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barra superior sticky del portal de cotización — extraída de
 * PropuestaMaterialesPublica.
 */

import { motion, useReducedMotion } from "motion/react";
import { Building2, ShieldCheck } from "lucide-react";

export default function TopBar() {
  const reduceMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/25 ring-1 ring-white/12 ring-inset">
            <Building2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">IVOO — Propuesta de Materiales</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal público de cotización</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 shadow-[0_0_12px_-4px_#34d399] sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          Envío seguro
        </div>
      </motion.div>
    </header>
  );
}
