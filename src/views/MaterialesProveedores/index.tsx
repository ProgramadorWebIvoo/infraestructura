/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal público de registro de proveedores — primera impresión de IVOO
 * para una empresa externa, se abre en pestaña propia desde "Proveedores"
 * (interno). Rediseño premium: fondo con orbes en deriva lenta (mismo
 * lenguaje visual que LoginScreen/BackgroundDecor), entrada en cascada
 * coordinada por sección en vez de un solo fadeIn, y stats con count-up.
 */

import { useEffect, useMemo, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Building2, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { Contractor } from "../../types";
import { springs } from "../../animations";
import RegistrationForm from "./components/RegistrationForm";

interface RegistroProveedoresPublicoProps {
  contractorsCount: number;
  onAddContractor: (contractor: Contractor) => void;
}

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const proofPoints = [
  { icon: Layers, label: "Un solo registro para toda la operación" },
  { icon: ShieldCheck, label: "Datos protegidos y uso exclusivamente interno" },
];

function AnimatedCount({ value, className }: { value: number; className: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString("es"));
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const controls = animate(motionValue, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.5 });
    return () => controls.stop();
  }, [value, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

export default function RegistroProveedoresPublico({
  contractorsCount,
  onAddContractor,
}: RegistroProveedoresPublicoProps) {
  const reduceMotion = useReducedMotion();
  const stats = useMemo(
    () => [
      { value: contractorsCount, label: "Proveedores activos", isCount: true },
      { value: "24/7", label: "Recepción digital", isCount: false },
    ],
    [contractorsCount],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white antialiased">
      {/* ── Fondo: mismo lenguaje que LoginScreen/BackgroundDecor — malla de
          gradientes en deriva lenta, nunca se detiene del todo. ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(155deg,#020617_0%,#0b1220_38%,#0c1e3d_62%,#020617_100%)]" />
        <motion.div
          className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-sky-500/20 blur-[110px]"
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
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/25 ring-1 ring-white/12 ring-inset">
              <Building2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">IVOO Registro de Proveedores</h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portal público</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 shadow-[0_0_12px_-4px_#34d399] sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Registro seguro
          </div>
        </motion.div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-82px)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <motion.section
          variants={reduceMotion ? undefined : heroContainer}
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          className="space-y-7"
        >
          <motion.div
            variants={heroItem}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-200"
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.5} />
            Base de datos IVOO
          </motion.div>

          <div className="space-y-4">
            <motion.h2 variants={heroItem} className="max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl">
              Registro público de
              <br />
              empresas proveedoras
            </motion.h2>
            <motion.p variants={heroItem} className="max-w-lg text-[15px] font-medium leading-relaxed text-slate-300/90">
              Complete los datos principales de su empresa para quedar disponible en el módulo interno de proveedores registrados.
            </motion.p>
          </div>

          <motion.ul variants={heroItem} className="space-y-3">
            {proofPoints.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icon className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" strokeWidth={2.25} />
                </span>
                <span className="pt-0.5 text-[13.5px] font-medium leading-snug text-slate-300/90">{label}</span>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={heroItem} className="grid max-w-lg grid-cols-2 gap-3">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -2 }}
                transition={springs.snappy}
                className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.07]"
              >
                {stat.isCount ? (
                  <AnimatedCount value={stat.value as number} className="text-2xl font-black text-white transition-colors group-hover:text-sky-300" />
                ) : (
                  <div className="text-2xl font-black text-white transition-colors group-hover:text-sky-300">{stat.value}</div>
                )}
                <div className="mt-1 font-semibold text-slate-400 transition-colors group-hover:text-slate-300">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.985 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <RegistrationForm onAddContractor={onAddContractor} />
        </motion.div>
      </main>
    </div>
  );
}
