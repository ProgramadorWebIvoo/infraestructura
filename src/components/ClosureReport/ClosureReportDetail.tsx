import { Loader2 } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import ClosureItemsTable from "./ClosureItemsTable";
import ClosurePhotoGrid from "./ClosurePhotoGrid";
import type { ClosureReport } from "./types";

interface ClosureReportDetailProps {
  report: ClosureReport | null;
  isLoading?: boolean;
  /** Muestra el finiquito propuesto por Auditoría (vista de Auditoría/Procura). */
  showFiniquito?: boolean;
}

function Notes({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

/** Informe de cierre completo: partidas contratado vs. ejecutado, notas y fotos de contratista y residente. */
export default function ClosureReportDetail({ report, isLoading, showFiniquito }: ClosureReportDetailProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!report) {
    return <p className="text-sm text-text-secondary">La obra aún no tiene informe de cierre.</p>;
  }

  return (
    <div className="space-y-4">
      {report.rejectionReason && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">Último rechazo: {report.rejectionReason}</p>
      )}
      <ClosureItemsTable items={report.items} />
      <Notes label="Observaciones del contratista" value={report.contractorNotes} />
      <Notes label="Notas del residente" value={report.residentNotes} />
      <Notes label="Notas de Auditoría" value={report.auditNotes} />
      {showFiniquito && report.finiquitoAmount != null && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          Finiquito propuesto: {formatCurrency(report.finiquitoAmount)}
        </p>
      )}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Evidencia fotográfica</p>
        <ClosurePhotoGrid photos={report.photos} />
      </div>
    </div>
  );
}
