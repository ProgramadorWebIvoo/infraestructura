/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Indicador de fuerza de contraseña: barra continua + checklist de
 * requisitos, ambos con feedback en vivo mientras el usuario escribe.
 * Reutilizable en cualquier flujo de alta/cambio de contraseña.
 */

import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import { SEMANTIC_COLOR_MAP, type SemanticColor } from "./colorTokens";
import { springs } from "../../animations";

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthMeterProps {
  password: string;
  requirements: PasswordRequirement[];
}

const STRENGTH_LEVELS: { label: string; role: SemanticColor; barClass: string }[] = [
  { label: "Muy débil", role: "danger", barClass: "bg-danger-500" },
  { label: "Débil", role: "danger", barClass: "bg-danger-400" },
  { label: "Aceptable", role: "warning", barClass: "bg-warning-500" },
  { label: "Buena", role: "info", barClass: "bg-info-500" },
  { label: "Fuerte", role: "success", barClass: "bg-success-500" },
];

function getStrength(metCount: number, total: number) {
  if (metCount === 0) return STRENGTH_LEVELS[0];
  const score = Math.round((metCount / total) * (STRENGTH_LEVELS.length - 1));
  return STRENGTH_LEVELS[Math.min(Math.max(score, 1), STRENGTH_LEVELS.length - 1)];
}

export default function PasswordStrengthMeter({ password, requirements }: PasswordStrengthMeterProps) {
  const metCount = requirements.filter((r) => r.met).length;
  const strength = getStrength(metCount, requirements.length);
  const semantic = SEMANTIC_COLOR_MAP[strength.role];
  const fillPercent = Math.max((metCount / requirements.length) * 100, password.length > 0 ? 8 : 0);

  if (password.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="mt-2.5 space-y-2.5 rounded-control border border-border-subtle bg-surface-sunken/50 p-3">
        {/* Strength bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Seguridad</span>
            <motion.span
              key={strength.label}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.snappy}
              className={`text-[10px] font-black ${semantic.text600}`}
            >
              {strength.label}
            </motion.span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-neutral-200/70">
            <motion.div
              initial={false}
              animate={{ width: `${fillPercent}%` }}
              transition={springs.snappy}
              className={`h-full rounded-pill ${strength.barClass}`}
            />
          </div>
        </div>

        {/* Requirement checklist */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {requirements.map((req) => (
            <li key={req.label} className="flex items-center gap-1.5 text-[10px] font-semibold">
              <AnimatePresence mode="wait" initial={false}>
                {req.met ? (
                  <motion.span
                    key="met"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={springs.snappy}
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${SEMANTIC_COLOR_MAP.success.bg100} ${SEMANTIC_COLOR_MAP.success.text600}`}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="unmet"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={springs.snappy}
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-neutral-200/70 text-text-muted"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
              <span className={req.met ? "text-text-secondary" : "text-text-muted"}>{req.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
