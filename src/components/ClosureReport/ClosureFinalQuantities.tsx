import { Loader2 } from "lucide-react";
import { useClosureReport } from "@/hooks/useClosureReport";
import { differs } from "./closureMeasurements";
import type { ClosureReportItem } from "./types";

interface ClosureFinalQuantitiesProps {
  projectId: string;
  authToken: string;
}

const finalOf = (item: ClosureReportItem) => item.finalQuantity ?? item.auditQuantity ?? item.residentQuantity ?? item.executedQuantity;

/**
 * Resumen compacto de las cantidades finales verificadas (final / contratado por partida),
 * para Procura y Finanzas junto al monto del finiquito. Resalta lo ajustado respecto a lo contratado.
 * Se monta solo cuando se necesita: cada instancia carga el informe de su obra.
 */
export default function ClosureFinalQuantities({ projectId, authToken }: ClosureFinalQuantitiesProps) {
  const { report, isLoading } = useClosureReport(projectId, authToken);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-text-secondary" aria-label="Cargando cantidades finales" />;
  }
  if (!report || report.items.length === 0) return null;

  const adjusted = report.items.filter((item) => differs(finalOf(item), item.contractedQuantity)).length;

  return (
    <div className="space-y-2" data-testid="closure-final-quantities">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
        Cantidades finales verificadas · {adjusted === 0 ? "todas las partidas completas" : `${adjusted} de ${report.items.length} ajustadas`}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {report.items.map((item) => {
          const changed = differs(finalOf(item), item.contractedQuantity);
          return (
            <li
              key={item.id}
              className={`rounded-pill border px-2.5 py-1 text-[11px] font-semibold ${
                changed ? "border-amber-200 bg-amber-50 text-amber-800" : "border-border-default bg-surface-raised text-text-secondary"
              }`}
            >
              {item.name}: <span className="font-mono">{finalOf(item)}</span>
              <span className="font-mono opacity-70">/{item.contractedQuantity}</span> {item.unit}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
