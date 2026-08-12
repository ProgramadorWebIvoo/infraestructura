/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal público de registro de proveedores.
 */

import { Contractor } from "../../types";
import { Building2, ShieldCheck } from "lucide-react";
import RegistrationForm from "./components/RegistrationForm";

interface RegistroProveedoresPublicoProps {
  contractorsCount: number;
  onAddContractor: (contractor: Contractor) => void;
}

export default function RegistroProveedoresPublico({
  contractorsCount,
  onAddContractor,
}: RegistroProveedoresPublicoProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white font-sans antialiased overflow-hidden">
      {/* ── Decoración de fondo ── */}
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px),
                            radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl -z-0" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl -z-0" />

      <header className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
              <Building2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">IVOO Registro de Proveedores</h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal publico</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 shadow-[0_0_12px_-4px_#34d399] sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Registro seguro
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid min-h-[calc(100vh-82px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 z-10">
        <section className="space-y-6 motion-safe:animate-[fadeIn_0.6s_ease-out]">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-200">
            Base de datos IVOO
          </div>
          <div className="space-y-4">
            <h2 className="max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Registro publico de empresas proveedoras
            </h2>
            <p className="max-w-lg text-sm font-medium leading-6 text-slate-300">
              Complete los datos principales de su empresa para quedar disponible en el modulo interno de proveedores registrados.
            </p>
          </div>
          <div className="grid max-w-lg grid-cols-2 gap-3 text-xs">
            <div className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.07]">
              <div className="text-2xl font-black text-white group-hover:text-sky-300 transition-colors">{contractorsCount}</div>
              <div className="mt-1 font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">Proveedores activos</div>
            </div>
            <div className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.07]">
              <div className="text-2xl font-black text-white group-hover:text-sky-300 transition-colors">24/7</div>
              <div className="mt-1 font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">Recepcion digital</div>
            </div>
          </div>
        </section>

        <RegistrationForm onAddContractor={onAddContractor} />
      </main>

      {/* keyframes para animaciones */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
