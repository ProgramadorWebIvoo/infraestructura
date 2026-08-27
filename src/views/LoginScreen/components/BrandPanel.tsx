/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel editorial del login — mitad izquierda en desktop. Establece la
 * identidad de marca antes de que el visitante llegue al formulario:
 * jerarquía deliberada (marca → titular → prueba de credibilidad) revelada
 * en secuencia, no toda de golpe.
 */

import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck, Layers, Lock } from "lucide-react";
import BackgroundDecor from "./BackgroundDecor";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const proofPoints = [
  { icon: Layers, label: "Toda la operación, en un solo lugar" },
  { icon: ShieldCheck, label: "Control y trazabilidad de principio a fin" },
  { icon: Lock, label: "Acceso restringido por rol" },
];

export default function BrandPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative hidden overflow-hidden lg:flex lg:w-[46%] xl:w-[42%]">
      <BackgroundDecor />

      <motion.div
        variants={reduceMotion ? undefined : container}
        initial={reduceMotion ? undefined : "hidden"}
        animate={reduceMotion ? undefined : "show"}
        className="relative z-10 flex w-full flex-col justify-between px-14 py-16 xl:px-20"
      >
        <motion.div variants={item} className="flex items-center gap-3.5">
          <img src="/ivoo_logoo.svg" alt="" aria-hidden="true" className="block h-9 w-auto brightness-0 invert" />
          <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/70">IVOO</span>
        </motion.div>

        <div className="max-w-md">
          <motion.p
            variants={item}
            className="mb-5 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300/80"
          >
            Bienvenido de nuevo
          </motion.p>
          <motion.h1
            variants={item}
            className="text-[2.6rem] font-black leading-[1.08] tracking-tight text-white xl:text-5xl"
          >
            La obra, bajo
            <br />
            control total.
          </motion.h1>
          <motion.p variants={item} className="mt-6 text-[15px] leading-relaxed text-slate-300/90">
            Ingrese sus credenciales para continuar.
          </motion.p>

          <motion.ul variants={item} className="mt-10 space-y-4">
            {proofPoints.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icon className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" strokeWidth={2.25} />
                </span>
                <span className="pt-0.5 text-[13.5px] font-medium leading-snug text-slate-300/90">{label}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.p variants={item} className="text-[11px] font-medium text-slate-500">
          IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()}
        </motion.p>
      </motion.div>
    </div>
  );
}
