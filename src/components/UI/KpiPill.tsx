/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Variante compacta de KpiCard: ícono + nombre + dato en una sola fila tipo
 * pill, para vistas donde el KPI es contexto secundario (ej. debajo de una
 * barra de tabs prominente) y la card grande de 4 líneas sería demasiado
 * peso visual.
 *
 * El valor numérico anima en count-up/down cuando cambia (útil porque estos
 * KPIs se recalculan en vivo sobre `projects` al sincronizar el estado tras
 * cualquier acción del flujo — antes el número saltaba de golpe sin dar
 * pista de que algo se sumó o restó), acompañado de un flash de color breve
 * en el pill: éxito si sube, neutral si baja. Valores no numéricos (string)
 * se muestran estáticos, sin animar.
 */

import { type ReactNode, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";
import { springs } from "../../animations";

interface KpiPillProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: SemanticColor;
}

function AnimatedValue({ value, className }: { value: number; className: string }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString("en-US"));
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;
    const controls = animate(motionValue, value, springs.gentle);
    previousValue.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

export default function KpiPill({ icon, label, value, accent = "brand" }: KpiPillProps) {
  const c = SEMANTIC_COLOR_MAP[accent];
  const isNumeric = typeof value === "number";

  const previousValue = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!isNumeric || typeof previousValue.current !== "number" || previousValue.current === value) {
      previousValue.current = value;
      return;
    }
    setFlash(value > previousValue.current ? "up" : "down");
    previousValue.current = value;
    const timeout = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(timeout);
  }, [value, isNumeric]);

  const flashRing = flash === "up" ? SEMANTIC_COLOR_MAP.success.border200 : flash === "down" ? SEMANTIC_COLOR_MAP.neutral.border200 : "";

  return (
    <motion.div
      animate={flash ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={flash ? { duration: 0.4, ease: "easeOut", times: [0, 0.4, 1] } : springs.snappy}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border shadow-xs min-w-38 justify-center transition-colors duration-300 ${
        flash ? `${flashRing} ring-1` : "border-border-default/80"
      }`}
    >
      <span className={c.icon500}>{icon}</span>
      <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wide">{label}</span>
      {isNumeric ? (
        <AnimatedValue value={value} className={`text-xs font-black font-mono ${c.text700}`} />
      ) : (
        <span className={`text-xs font-black font-mono ${c.text700}`}>{value}</span>
      )}
    </motion.div>
  );
}
