import { CheckCircle2, TriangleAlert } from "lucide-react";

interface ClosureMeasurementSummaryProps {
  differences: number;
  totalItems: number;
}

/** Resumen en vivo sobre la tabla de partidas: cuántas difieren de lo contratado. */
export default function ClosureMeasurementSummary({ differences, totalItems }: ClosureMeasurementSummaryProps) {
  const base = "lo contratado";

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
    </div>
  );
}
