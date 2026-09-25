/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marco visual del portal público de cierre — mismo lenguaje que los demás
 * enlaces públicos (fondo con orbes, TopBar sticky, entrada suave). Se
 * duplica por módulo a propósito (cada portal público es un chunk lazy
 * independiente), igual que en RenegociacionPublica.
 */

import { motion, useReducedMotion } from "motion/react";
import { ClipboardCheck, ShieldCheck } from "lucide-react";

export function BackgroundDecor() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#020617_0%,#0b1220_38%,#0c1e3d_62%,#020617_100%)]" />
      <motion.div
        className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-emerald-500/20 blur-[110px]"
        animate={reduceMotion ? undefined : { x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-indigo-500/15 blur-[120px]"
        animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -26, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 21, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}

export function TopBar() {
  const reduceMotion = useReducedMotion();
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25 ring-1 ring-white/12 ring-inset">
            <ClipboardCheck className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight">IVOO — Informe de Cierre de Obra</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal público del contratista</p>
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
