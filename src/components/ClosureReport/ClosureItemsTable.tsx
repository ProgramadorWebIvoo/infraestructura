import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import NumericInput from "@/components/UI/NumericInput";
import FieldError from "@/components/UI/FieldError";
import { differs, differsFromBaseline, parseQuantity, type MeasurementDraft, type MeasurementDrafts } from "./closureMeasurements";
import { isDecrease, type ClosureReportItem } from "./types";

/** readonly: comparación completa · resident: el residente mide. */
export type ClosureTableMode = "readonly" | "resident";

interface ClosureItemsTableProps {
  items: ClosureReportItem[];
  mode?: ClosureTableMode;
  drafts?: MeasurementDrafts;
  errors?: Record<number, string>;
  onDraftChange?: (itemId: number, patch: Partial<MeasurementDraft>) => void;
  disabled?: boolean;
}

const GRID_BY_COLUMNS: Record<number, string> = {
  3: "md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]",
  4: "md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]",
  5: "md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]",
};

function Cell({ label, tone, children }: { label: string; tone?: "warn" | "alert" | "ok"; children: React.ReactNode }) {
  const toneClass =
    tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : tone === "alert" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-transparent";
  return (
    <div className={`rounded-lg border px-2 py-1.5 md:text-right ${toneClass}`}>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary md:hidden">{label}</span>
      <div className="font-mono text-xs font-semibold">{children}</div>
    </div>
  );
}

function StageNote({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="text-[11px] text-text-secondary">
      <span className="font-bold">{label}:</span> {value}
    </p>
  );
}

/**
 * Comparación por partida de las cifras del cierre — contratado, declarado por el
 * contratista y verificado por el residente (que rige el finiquito). El residente solo ve lo contratado. Tarjetas apiladas
 * en móvil y tabla en escritorio (misma estructura, solo cambia la rejilla).
 */
export default function ClosureItemsTable({ items, mode = "readonly", drafts = {}, errors = {}, onDraftChange, disabled = false }: ClosureItemsTableProps) {
  const showResident = mode === "readonly" && items.some((i) => i.residentQuantity != null);
  const showContractor = mode !== "resident";
  const columns = 2 + (showContractor ? 1 : 0) + (mode === "resident" ? 1 : 0) + (showResident ? 1 : 0);
  const gridClass = GRID_BY_COLUMNS[columns] ?? GRID_BY_COLUMNS[5];
  const editable = mode !== "readonly";
  const editLabel = "Verificado en obra";

  return (
    <div className="space-y-2" role="table" aria-label="Comparación de partidas del cierre">
      <div role="row" className={`hidden gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary md:grid ${gridClass}`}>
        <span role="columnheader">Partida</span>
        <span role="columnheader" className="text-right">Contratado</span>
        {showContractor && <span role="columnheader" className="text-right">Contratista</span>}
        {showResident && <span role="columnheader" className="text-right">Residente</span>}
        {mode === "resident" && <span role="columnheader" className="text-right">{editLabel}</span>}
      </div>

      {items.map((item) => {
        const draft = drafts[item.id];
        const error = errors[item.id];
        const differsNow = editable && draft ? differsFromBaseline(item, draft) : false;
        const contractorDecrease = isDecrease(item);
        const residentDiffers = differs(item.residentQuantity, item.executedQuantity);

        return (
          <motion.div
            key={item.id}
            layout
            role="row"
            data-testid={`closure-item-${item.id}`}
            className={`rounded-xl border p-3 ${
              error ? "border-rose-300 bg-rose-50/40" : differsNow || residentDiffers ? "border-amber-200 bg-amber-50/40" : "border-border-default bg-surface"
            }`}
          >
            <div className={`grid grid-cols-2 items-start gap-2 ${gridClass}`}>
              <div role="cell" className="col-span-2 min-w-0 md:col-span-1">
                <p className="truncate text-sm font-bold text-text-primary">{item.name}</p>
                <p className="text-[11px] text-text-secondary">{item.unit}</p>
              </div>
              <div role="cell">
                <Cell label="Contratado">
                  {item.contractedQuantity}
                  {!!item.modificationQuantity && (
                    <span className="block text-[10px] font-medium text-text-secondary" data-testid={`closure-modification-${item.id}`}>
                      {item.originalQuantity} {item.modificationQuantity > 0 ? "+" : "−"} {Math.abs(item.modificationQuantity)} modif.
                    </span>
                  )}
                </Cell>
              </div>
              {showContractor && (
                <div role="cell">
                  <Cell label="Contratista" tone={contractorDecrease ? "warn" : undefined}>{item.executedQuantity}</Cell>
                </div>
              )}
              {showResident && (
                <div role="cell">
                  <Cell label="Residente" tone={residentDiffers ? "warn" : undefined}>{item.residentQuantity ?? "—"}</Cell>
                </div>
              )}
              {editable && draft && (
                <div role="cell" className="col-span-2 md:col-span-1">
                  <label htmlFor={`closure-qty-${item.id}`} className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary md:hidden">
                    {editLabel}
                  </label>
                  <NumericInput
                    id={`closure-qty-${item.id}`}
                    value={parseQuantity(draft.quantity) ?? ""}
                    integer
                    placeholder="0"
                    disabled={disabled}
                    accent={error ? "danger" : "brand"}
                    className="w-full text-right font-mono"
                    onChange={(value) => onDraftChange?.(item.id, { quantity: value === "" ? "" : String(value) })}
                  />
                </div>
              )}
            </div>

            <div className="mt-2 space-y-1">
              {showContractor && <StageNote label="Contratista" value={item.note} />}
              {mode !== "resident" && <StageNote label="Residente" value={item.residentNote} />}
            </div>

            <AnimatePresence initial={false}>
              {editable && draft && differsNow && (
                <motion.div
                  key="note"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label htmlFor={`closure-note-${item.id}`} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                    Justifique el aumento o la disminución respecto a lo contratado
                  </label>
                  <textarea
                    id={`closure-note-${item.id}`}
                    value={draft.note}
                    maxLength={500}
                    rows={2}
                    disabled={disabled}
                    onChange={(e) => onDraftChange?.(item.id, { note: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-surface p-2 text-xs"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <FieldError message={error} />
          </motion.div>
        );
      })}
    </div>
  );
}
