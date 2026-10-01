import NumericInput from "@/components/UI/NumericInput";
import FieldError from "@/components/UI/FieldError";
import ProductLinesTable, { type ProductColumn } from "@/components/UI/ProductLinesTable";
import { differs, differsFromBaseline, parseQuantity, type MeasurementDraft, type MeasurementDrafts } from "./closureMeasurements";
import { isDecrease, isIncrease, type ClosureReportItem } from "./types";

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

const WARN_CHIP = "border-amber-200 bg-amber-50 text-amber-800";

function QuantityChip({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return <span className={`inline-block rounded-lg border px-2 py-1 font-mono text-xs font-semibold ${warn ? WARN_CHIP : "border-transparent text-text-primary"}`}>{children}</span>;
}

function StageNote({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="line-clamp-2 text-[11px] text-text-secondary" title={value}>
      <span className="font-bold">{label}:</span> {value}
    </p>
  );
}

/**
 * Comparación por partida de las cifras del cierre — contratado, declarado por el
 * contratista y verificado por el residente (que rige el finiquito). El residente solo
 * ve lo contratado y mide. Tabla paginada con buscador: una obra puede traer ~70 partidas,
 * y la justificación solo aparece en las filas que se apartan de lo contratado.
 */
export default function ClosureItemsTable({ items, mode = "readonly", drafts = {}, errors = {}, onDraftChange, disabled = false }: ClosureItemsTableProps) {
  const showResident = mode === "readonly" && items.some((i) => i.residentQuantity != null);
  const showContractor = mode !== "resident";
  const editable = mode !== "readonly";

  const residentDiffers = (item: ClosureReportItem) => differs(item.residentQuantity, item.executedQuantity);
  const draftDiffers = (item: ClosureReportItem) => (editable && drafts[item.id] ? differsFromBaseline(item, drafts[item.id]) : false);
  const isAdjusted = (item: ClosureReportItem) => (editable ? draftDiffers(item) : isDecrease(item) || isIncrease(item) || residentDiffers(item));

  const columns: ProductColumn<ClosureReportItem>[] = [
    {
      key: "name",
      label: "Partida",
      render: (item) => (
        <div className="max-w-64 min-w-32">
          <p className="truncate text-sm font-bold text-text-primary" title={item.name}>
            {item.name}
          </p>
          <p className="text-[11px] text-text-secondary">{item.unit}</p>
        </div>
      ),
    },
    { key: "contracted", label: "Contratado", align: "right", render: (item) => <QuantityChip>{item.contractedQuantity}</QuantityChip> },
  ];

  if (showContractor) {
    columns.push({ key: "contractor", label: "Contratista", align: "right", render: (item) => <QuantityChip warn={isDecrease(item)}>{item.executedQuantity}</QuantityChip> });
  }
  if (showResident) {
    columns.push({ key: "resident", label: "Residente", align: "right", render: (item) => <QuantityChip warn={residentDiffers(item)}>{item.residentQuantity ?? "—"}</QuantityChip> });
  }

  if (mode === "resident") {
    columns.push(
      {
        key: "verified",
        label: "Verificado en obra",
        align: "right",
        render: (item) => {
          const draft = drafts[item.id];
          if (!draft) return null;
          return (
            <NumericInput
              id={`closure-qty-${item.id}`}
              value={parseQuantity(draft.quantity) ?? ""}
              integer
              placeholder="0"
              disabled={disabled}
              accent={errors[item.id] ? "danger" : "brand"}
              className="ml-auto w-28! px-2! py-1.5! text-right! font-mono"
              onChange={(value) => onDraftChange?.(item.id, { quantity: value === "" ? "" : String(value) })}
            />
          );
        },
      },
      {
        key: "justification",
        label: "Justificación",
        render: (item) => {
          const draft = drafts[item.id];
          const error = errors[item.id];
          return (
            <div className="min-w-48 space-y-1">
              {draft && draftDiffers(item) ? (
                <input
                  id={`closure-note-${item.id}`}
                  type="text"
                  value={draft.note}
                  maxLength={500}
                  disabled={disabled}
                  aria-label={`Justificación de ${item.name}`}
                  placeholder="Obligatoria: motivo del aumento o disminución"
                  onChange={(e) => onDraftChange?.(item.id, { note: e.target.value })}
                  className="w-full rounded-lg border border-amber-200 bg-surface px-2 py-1.5 text-xs outline-hidden focus:border-amber-400"
                />
              ) : (
                <span className="text-xs text-text-secondary">—</span>
              )}
              <FieldError message={error} />
            </div>
          );
        },
      },
    );
  } else {
    columns.push({
      key: "notes",
      label: "Notas",
      render: (item) => (
        <div className="max-w-72 min-w-40 space-y-1">
          {showContractor && <StageNote label="Contratista" value={item.note} />}
          <StageNote label="Residente" value={item.residentNote} />
          {!item.note && !item.residentNote && <span className="text-xs text-text-secondary">—</span>}
        </div>
      ),
    });
  }

  return (
    <ProductLinesTable
      ariaLabel="Comparación de partidas del cierre"
      items={items}
      columns={columns}
      rowKey={(item) => item.id}
      rowAlign="top"
      maxHeight="26rem"
      searchText={(item) => item.name}
      searchPlaceholder="Buscar partida…"
      filters={[
        { key: "adjusted", label: "Con diferencias", predicate: isAdjusted },
        ...(editable ? [{ key: "errors", label: "Con errores", predicate: (item: ClosureReportItem) => Boolean(errors[item.id]) }] : []),
      ]}
      rowTestId={(item) => `closure-item-${item.id}`}
      rowClassName={(item) => (errors[item.id] ? "bg-rose-50/40" : isAdjusted(item) ? "bg-amber-50/40" : "")}
      emptyMessage="Ninguna partida coincide con la búsqueda."
    />
  );
}
