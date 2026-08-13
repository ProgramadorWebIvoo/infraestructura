/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cuadro de ayuda contextual, colapsable. Pensado para explicar un mecanismo
 * (fórmulas, umbrales, reglas de negocio) sin ocupar espacio permanente si el
 * usuario ya lo conoce — arranca abierto por defecto y recuerda su estado
 * solo mientras el componente sigue montado (no persiste entre sesiones).
 */

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Info } from "lucide-react";

type InfoBannerColor = "sky" | "amber" | "emerald" | "indigo" | "slate";

interface InfoBannerProps {
  title: string;
  children: ReactNode;
  color?: InfoBannerColor;
  defaultOpen?: boolean;
  className?: string;
}

const COLOR_MAP: Record<InfoBannerColor, { border: string; bg: string; icon: string; title: string; text: string }> = {
  sky: { border: "border-sky-100", bg: "bg-sky-50/60", icon: "text-sky-500", title: "text-sky-900", text: "text-sky-800" },
  amber: { border: "border-amber-100", bg: "bg-amber-50/60", icon: "text-amber-500", title: "text-amber-900", text: "text-amber-800" },
  emerald: { border: "border-emerald-100", bg: "bg-emerald-50/60", icon: "text-emerald-500", title: "text-emerald-900", text: "text-emerald-800" },
  indigo: { border: "border-indigo-100", bg: "bg-indigo-50/60", icon: "text-indigo-500", title: "text-indigo-900", text: "text-indigo-800" },
  slate: { border: "border-slate-200", bg: "bg-slate-50/60", icon: "text-slate-500", title: "text-slate-900", text: "text-slate-700" },
};

export default function InfoBanner({ title, children, color = "sky", defaultOpen = true, className = "" }: InfoBannerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const c = COLOR_MAP[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2.5 p-3.5 text-left cursor-pointer"
      >
        <Info className={`h-4 w-4 shrink-0 ${c.icon}`} />
        <span className={`flex-1 text-[11px] font-bold ${c.title}`}>{title}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`h-3.5 w-3.5 ${c.icon}`} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-3.5 pb-3.5 -mt-1 text-[11px] leading-relaxed ${c.text}`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
