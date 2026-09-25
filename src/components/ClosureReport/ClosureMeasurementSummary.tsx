import { CheckCircle2, Scale, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";

interface ClosureMeasurementSummaryProps {
  stage: "resident" | "audit";
  differences: number;
  totalItems: number;
  /** Vista previa del finiquito (solo Auditoría); null si no hay datos para calcularla. */
  finiquitoPreview?: number | null;
}

/** Resumen en vivo sobre la tabla de partidas: cuántas difieren y, para Auditoría, el finiquito estimado. */
export default function ClosureMeasurementSummary({ stage, differences, totalItems, finiquitoPreview }: ClosureMeasurementSummaryProps) {
  const base = stage === "resident" ? "lo declarado por el contratista" : "la medición del residente";

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="closure-measurement-summary">
      <p
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
          differences > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
        }`}
        role="status"
      >
        {differences > 0 ? <TriangleAlert className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
        {differences > 0
          ? `${differences} ${differences === 1 ? "partida con diferencia" : "partidas con diferencia"} respecto a ${base} (de ${totalItems})`
          : `Sin diferencias respecto a ${base}`}
      </p>
      {stage === "audit" && finiquitoPreview != null && (
        <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <Scale className="h-4 w-4" aria-hidden />
          <span>
            Finiquito estimado: <strong className="font-mono">{formatCurrency(finiquitoPreview)}</strong>
            <span className="ml-1 text-[10px] font-medium opacity-80">(vista previa; el monto oficial lo calcula el sistema)</span>
          </span>
        </p>
      )}
    </div>
  );
}
