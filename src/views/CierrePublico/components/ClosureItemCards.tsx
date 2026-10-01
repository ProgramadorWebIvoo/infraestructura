import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import NumericInput from "@/components/UI/NumericInput";
import ProductLinesTable, { type ProductColumn } from "@/components/UI/ProductLinesTable";
import { isDecrease, isIncrease, validateClosureItem, type ClosureReportItem } from "@/components/ClosureReport/types";

interface ClosureItemCardsProps {
  items: ClosureReportItem[];
  editable: boolean;
  onChange: (id: number, patch: Partial<ClosureReportItem>) => void;
}

const BADGE = "mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300";

/**
 * Partidas del informe de cierre en una tabla compacta (misma que el resto de la app, en tono
 * oscuro): con ~70 partidas, una tarjeta por línea era una pared de campos. Paginada, con
 * buscador y filtros «con ajustes» / «sin justificar» para llegar rápido a lo pendiente.
 */
const hasAdjustment = (item: ClosureReportItem) => isDecrease(item) || isIncrease(item);

export default function ClosureItemCards({ items, editable, onChange }: ClosureItemCardsProps) {
  // El error de una partida depende solo de la propia partida: se calcula por fila, sin recibir un
  // array nuevo en cada tecla. Con `onChange` estable, las columnas se memoizan y escribir en una
  // partida re-renderiza solo esa fila.
  const errorOf = (item: ClosureReportItem) => (editable ? validateClosureItem(item) : null);

  const columns = useMemo<ProductColumn<ClosureReportItem>[]>(() => [
    {
      key: "name",
      label: "Partida",
      render: (item) => {
        const percent = item.contractedQuantity > 0 ? Math.round((item.executedQuantity / item.contractedQuantity) * 100) : 100;
        return (
          <div className="max-w-64 min-w-36">
            <p className="text-sm font-black text-white">{item.name}</p>
            {isDecrease(item) && (
              <span className={BADGE}>
                <TrendingDown className="h-3 w-3" />
                Disminución · {percent}% ejecutado
              </span>
            )}
            {isIncrease(item) && (
              <span className={BADGE}>
                <TrendingUp className="h-3 w-3" />
                Aumento · +{item.executedQuantity - item.contractedQuantity} {item.unit}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "contracted",
      label: "Contratado",
      render: (item) => (
        <p className="font-mono text-sm font-bold text-slate-200">
          {item.contractedQuantity} <span className="text-xs font-medium text-slate-500">{item.unit}</span>
        </p>
      ),
    },
    {
      key: "executed",
      label: "Ejecutado",
      render: (item) => (
        <NumericInput
          id={`executed-${item.id}`}
          value={item.executedQuantity}
          integer
          placeholder="0"
          accent={hasAdjustment(item) ? "warning" : undefined}
          onChange={(v) => onChange(item.id, { executedQuantity: v === "" ? 0 : v })}
          className={`w-28! bg-white/5! text-slate-200! border-white/10! px-2! py-1.5! ${editable ? "" : "pointer-events-none opacity-60"}`}
        />
      ),
    },
    {
      key: "justification",
      label: "Justificación",
      render: (item) => {
        const error = editable ? validateClosureItem(item) : null;
        return (
          <div className="min-w-52 space-y-1">
            <input
              id={`note-${item.id}`}
              type="text"
              value={item.note ?? ""}
              disabled={!editable}
              maxLength={500}
              aria-label={`Justificación de ${item.name}`}
              aria-invalid={Boolean(error)}
              placeholder={isIncrease(item) ? "Obligatoria: motivo del aumento" : isDecrease(item) ? "Obligatoria: motivo de la disminución" : "Opcional"}
              onChange={(e) => onChange(item.id, { note: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 outline-hidden transition focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-60"
            />
            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        );
      },
    },
  ], [editable, onChange]);

  return (
    <ProductLinesTable
      tone="dark"
      ariaLabel="Partidas ejecutadas"
      items={items}
      columns={columns}
      rowKey={(item) => item.id}
      rowAlign="top"
      maxHeight="30rem"
      searchText={(item) => item.name}
      searchPlaceholder="Buscar partida…"
      filters={[
        { key: "adjusted", label: "Con ajustes", predicate: hasAdjustment },
        ...(editable ? [{ key: "unjustified", label: "Sin justificar", predicate: (item: ClosureReportItem) => Boolean(errorOf(item)) }] : []),
      ]}
      rowClassName={(item) => (errorOf(item) ? "bg-amber-400/5" : "")}
      emptyMessage="Ninguna partida coincide con la búsqueda."
    />
  );
}
