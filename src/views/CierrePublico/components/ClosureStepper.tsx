import { motion, useReducedMotion } from "motion/react";
import { Camera, Check, ListChecks, Send } from "lucide-react";

interface ClosureStepperProps {
  itemsValid: boolean;
  hasPhotos: boolean;
  readyToSend: boolean;
}

const STEPS = [
  { key: "items", label: "Partidas", icon: ListChecks },
  { key: "photos", label: "Fotos", icon: Camera },
  { key: "send", label: "Enviar", icon: Send },
] as const;

/** Progreso del informe: partidas válidas → al menos una foto → listo para enviar. */
export default function ClosureStepper({ itemsValid, hasPhotos, readyToSend }: ClosureStepperProps) {
  const reduceMotion = useReducedMotion();
  const done = [itemsValid, hasPhotos, readyToSend];
  const completed = done.filter(Boolean).length;

  return (
    <nav aria-label="Progreso del informe" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((step, index) => {
          const isDone = done[index];
          const Icon = isDone ? Check : step.icon;
          return (
            <li key={step.key} className="flex flex-col items-center gap-1.5 text-center" aria-current={!isDone && done.slice(0, index).every(Boolean) ? "step" : undefined}>
              <motion.span
                animate={reduceMotion ? undefined : { scale: isDone ? [1, 1.18, 1] : 1 }}
                transition={{ duration: 0.35 }}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs transition-colors ${
                  isDone ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </motion.span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDone ? "text-emerald-300" : "text-slate-500"}`}>{step.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completed} aria-label="Avance del informe">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
          initial={false}
          animate={{ width: `${(completed / 3) * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </nav>
  );
}
