import { isDecrease, type ClosureReportItem } from "./types";

interface ClosureItemsTableProps {
  items: ClosureReportItem[];
}

/** Comparación de solo lectura contratado vs. ejecutado; resalta las disminuciones. */
export default function ClosureItemsTable({ items }: ClosureItemsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface-raised text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          <tr>
            <th className="px-3 py-2">Partida</th>
            <th className="px-3 py-2 text-right">Contratado</th>
            <th className="px-3 py-2 text-right">Ejecutado</th>
            <th className="px-3 py-2">Nota</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const decrease = isDecrease(item);
            return (
              <tr key={item.id} className={decrease ? "bg-amber-50" : undefined} data-testid={`closure-item-${item.id}`}>
                <td className="px-3 py-2 font-semibold text-text-primary">{item.name}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {item.contractedQuantity} {item.unit}
                </td>
                <td className={`px-3 py-2 text-right font-mono ${decrease ? "font-bold text-amber-700" : ""}`}>
                  {item.executedQuantity} {item.unit}
                </td>
                <td className="px-3 py-2 text-text-secondary">{item.note ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
