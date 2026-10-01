import { useState } from "react";
import { ListTree, Loader2 } from "lucide-react";
import Modal from "@/components/UI/Modal";
import ProductLinesTable, { type ProductColumn } from "@/components/UI/ProductLinesTable";
import { useClosureReport } from "@/hooks/useClosureReport";
import { differs } from "./closureMeasurements";
import type { ClosureReportItem } from "./types";

interface ClosureFinalQuantitiesProps {
  projectId: string;
  authToken: string;
}

/** Cuántas partidas ajustadas se listan en el resumen; el resto se ve en el modal. */
const PREVIEW_LIMIT = 4;

const finalOf = (item: ClosureReportItem) => item.finalQuantity ?? item.residentQuantity ?? item.executedQuantity;
const isAdjusted = (item: ClosureReportItem) => differs(finalOf(item), item.contractedQuantity);
const signed = (value: number) => `${value > 0 ? "+" : ""}${Number(value.toFixed(2))}`;

const FULL_TABLE_COLUMNS: ProductColumn<ClosureReportItem>[] = [
  {
    key: "name",
    label: "Partida",
    render: (item) => (
      <div className="max-w-72 min-w-32">
        <p className="truncate text-xs font-bold text-slate-800" title={item.name}>
          {item.name}
        </p>
        <p className="text-[10px] text-slate-500">{item.unit}</p>
      </div>
    ),
  },
  { key: "contracted", label: "Contratado", align: "right", className: "font-mono text-xs text-slate-600", render: (item) => item.contractedQuantity },
  { key: "final", label: "Final verificado", align: "right", className: "font-mono text-xs font-bold text-slate-800", render: (item) => finalOf(item) },
  {
    key: "difference",
    label: "Diferencia",
    align: "right",
    render: (item) =>
      isAdjusted(item) ? (
        <span className="inline-block rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-800">{signed(finalOf(item) - item.contractedQuantity)}</span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
  },
];

/**
 * Resumen de las cantidades finales verificadas para Procura y Finanzas junto al monto del
 * finiquito. Con ~70 partidas, una lista de pills desbordaba la tarjeta: ahora se muestra el
 * conteo de ajustes, solo las primeras partidas ajustadas y un acceso a la tabla completa
 * (con buscador y filtro) en un modal. Se monta solo cuando se necesita: cada instancia carga
 * el informe de su obra.
 */
export default function ClosureFinalQuantities({ projectId, authToken }: ClosureFinalQuantitiesProps) {
  const { report, isLoading } = useClosureReport(projectId, authToken);
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-secondary" aria-label="Cargando cantidades finales" />;
  }
  if (!report || report.items.length === 0) return null;

  const total = report.items.length;
  const adjusted = report.items.filter(isAdjusted);
  const preview = adjusted.slice(0, PREVIEW_LIMIT);
  const hidden = adjusted.length - preview.length;

  return (
    <div className="space-y-2" data-testid="closure-final-quantities">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          Cantidades finales verificadas · {adjusted.length === 0 ? "todas las partidas completas" : `${adjusted.length} de ${total} ajustadas`}
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-control border border-border-default px-2.5 py-1 text-[11px] font-bold text-text-primary transition-colors hover:bg-surface-sunken"
        >
          <ListTree className="h-3.5 w-3.5" />
          Ver las {total} partidas
        </button>
      </div>

      {preview.length > 0 && (
        <ul className="space-y-1">
          {preview.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              <span className="min-w-0 truncate" title={item.name}>
                {item.name}
              </span>
              <span className="shrink-0 font-mono">
                {finalOf(item)}
                <span className="opacity-70">/{item.contractedQuantity}</span> {item.unit} <span className="font-bold">({signed(finalOf(item) - item.contractedQuantity)})</span>
              </span>
            </li>
          ))}
          {hidden > 0 && <li className="px-1 text-[11px] font-medium text-text-secondary">y {hidden} partida{hidden === 1 ? "" : "s"} más ajustada{hidden === 1 ? "" : "s"}…</li>}
        </ul>
      )}

      {isOpen && (
        <Modal
          isOpen
          onClose={() => setIsOpen(false)}
          maxWidth="max-w-3xl"
          icon={<ListTree className="h-5 w-5" />}
          iconColor="emerald"
          badge={`${total} partidas`}
          title="Cantidades finales verificadas"
          infoLine={adjusted.length === 0 ? "Todas las partidas coinciden con lo contratado" : `${adjusted.length} ajustada${adjusted.length === 1 ? "" : "s"} respecto a lo contratado`}
        >
          <ProductLinesTable
            ariaLabel="Cantidades finales verificadas"
            items={report.items}
            columns={FULL_TABLE_COLUMNS}
            rowKey={(item) => item.id}
            searchText={(item) => item.name}
            searchPlaceholder="Buscar partida…"
            filters={[{ key: "adjusted", label: "Solo ajustadas", predicate: isAdjusted }]}
            rowClassName={(item) => (isAdjusted(item) ? "bg-amber-50/40" : "")}
            emptyMessage="Ninguna partida coincide con la búsqueda."
          />
        </Modal>
      )}
    </div>
  );
}
