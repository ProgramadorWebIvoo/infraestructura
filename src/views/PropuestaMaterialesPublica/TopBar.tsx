/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barra superior sticky del portal de cotización — extraída de
 * PropuestaMaterialesPublica.
 */

import { Building2, ShieldCheck } from "lucide-react";

export default function TopBar() {
  return (
    <header className="border-b border-white/10 bg-slate-950/90 sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
            <Building2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">IVOO — Propuesta de Materiales</h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal publico de cotizacion</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          Envio seguro
        </div>
      </div>
    </header>
  );
}
