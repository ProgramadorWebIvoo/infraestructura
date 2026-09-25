import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, TrendingDown } from "lucide-react";
import NumericInput from "@/components/UI/NumericInput";
import { isDecrease, type ClosureReportItem } from "@/components/ClosureReport/types";

interface ClosureItemCardsProps {
  items: ClosureReportItem[];
  errors: (string | null)[];
  editable: boolean;
  onChange: (id: number, patch: Partial<ClosureReportItem>) => void;
}

/** Partidas como tarjetas: apiladas en móvil, en una sola fila de 4 columnas desde `md`. */
export default function ClosureItemCards({ items, errors, editable, onChange }: ClosureItemCardsProps) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const decrease = isDecrease(item);
        const error = editable ? errors[index] : null;
        const percent = item.contractedQuantity > 0 ? Math.round((item.executedQuantity / item.contractedQuantity) * 100) : 100;

        return (
          <motion.li
            key={item.id}
            layout
            className={`rounded-2xl border p-4 transition-colors ${
              error ? "border-amber-400/40 bg-amber-400/5" : decrease ? "border-amber-400/25 bg-white/[0.03]" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_1fr_1.6fr] md:items-start">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 md:hidden">Partida</span>
                <p className="text-sm font-black text-white">{item.name}</p>
                {decrease && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    <TrendingDown className="h-3 w-3" />
                    Disminución · {percent}% ejecutado
                  </span>
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Contratado</span>
                <p className="font-mono text-sm font-bold text-slate-200">
                  {item.contractedQuantity} <span className="text-xs font-medium text-slate-500">{item.unit}</span>
                </p>
              </div>

              <div>
                <label htmlFor={`executed-${item.id}`} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ejecutado
                </label>
                <NumericInput
                  id={`executed-${item.id}`}
                  value={item.executedQuantity}
                  max={item.contractedQuantity}
                  accent={decrease ? "warning" : undefined}
                  onChange={(v) => onChange(item.id, { executedQuantity: v === "" ? 0 : v })}
                  className={`bg-white/5! text-slate-200! border-white/10! ${editable ? "" : "pointer-events-none opacity-60"}`}
                />
              </div>

              <div>
                <label htmlFor={`note-${item.id}`} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Justificación
                </label>
                <input
                  id={`note-${item.id}`}
                  type="text"
                  value={item.note ?? ""}
                  disabled={!editable}
                  maxLength={500}
                  aria-invalid={Boolean(error)}
                  placeholder={decrease ? "Obligatoria: motivo de la disminución" : "Opcional"}
                  onChange={(e) => onChange(item.id, { note: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-200 outline-hidden transition focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-60"
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-1.5 overflow-hidden text-[11px] font-bold text-amber-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ul>
  );
}
