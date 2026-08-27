/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fondo del panel de marca — malla de gradientes en movimiento lento,
 * grid arquitectónico y viñeta. Puramente decorativo (aria-hidden).
 */

import { motion, useReducedMotion } from "motion/react";

export default function BackgroundDecor() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base: gradiente diagonal profundo */}
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#020617_0%,#0b1220_38%,#0c1e3d_62%,#020617_100%)]" />

      {/* Orbes de luz — deriva lenta, nunca se detienen del todo */}
      <motion.div
        className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-sky-500/20 blur-[110px]"
        animate={reduceMotion ? undefined : { x: [0, 40, 0], y: [0, 24, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-indigo-500/15 blur-[120px]"
        animate={reduceMotion ? undefined : { x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute left-1/3 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[100px]"
        animate={reduceMotion ? undefined : { opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid arquitectónico sutil, se desvanece hacia los bordes */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />

      {/* Grano fino — evita el look "flat" de un gradiente puro */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Viñeta para anclar el contraste hacia los bordes */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}
