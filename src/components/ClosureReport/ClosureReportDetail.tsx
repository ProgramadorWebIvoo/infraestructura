import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@ivoo/shared";
import ClosureItemsTable, { type ClosureTableMode } from "./ClosureItemsTable";
import ClosurePhotoGrid from "./ClosurePhotoGrid";
import type { MeasurementDraft, MeasurementDrafts } from "./closureMeasurements";
import type { ClosureReport } from "./types";

interface ClosureReportDetailProps {
  report: ClosureReport | null;
  isLoading?: boolean;
  /** Muestra el finiquito propuesto por Auditoría (vista de Auditoría/Procura). */
  showFiniquito?: boolean;
  /** Modo de la tabla de partidas: solo lectura, o edición de la etapa que mide. */
  tableMode?: ClosureTableMode;
  drafts?: MeasurementDrafts;
  errors?: Record<number, string>;
  onDraftChange?: (itemId: number, patch: Partial<MeasurementDraft>) => void;
  disabled?: boolean;
  /** Resumen en vivo (diferencias, vista previa del finiquito) que se ubica sobre la tabla. */
  summary?: ReactNode;
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

/** Informe de cierre completo: partidas (contratado, contratista, residente, final), notas por etapa y fotos por autor. */
export default function ClosureReportDetail({
  report,
  isLoading,
  showFiniquito,
  tableMode = "readonly",
  drafts,
  errors,
  onDraftChange,
  disabled,
  summary,
}: ClosureReportDetailProps) {
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

  const contractorPhotos = report.photos.filter((p) => p.uploadedByType === "CONTRATISTA");
  const residentPhotos = report.photos.filter((p) => p.uploadedByType === "RESIDENTE");

  return (
    <div className="space-y-4">
      {report.rejectionReason && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">Último rechazo: {report.rejectionReason}</p>
      )}
      {summary}
      <ClosureItemsTable items={report.items} mode={tableMode} drafts={drafts} errors={errors} onDraftChange={onDraftChange} disabled={disabled} />
      <Notes label="Observaciones del contratista" value={report.contractorNotes} />
      <Notes label="Notas del residente" value={report.residentNotes} />
      <Notes label="Notas de Auditoría" value={report.auditNotes} />
      {showFiniquito && report.finiquitoAmount != null && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          Finiquito propuesto: {formatCurrency(report.finiquitoAmount)}
        </p>
      )}
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Evidencia del contratista</p>
          <ClosurePhotoGrid photos={contractorPhotos} />
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Verificación en obra del residente</p>
          <ClosurePhotoGrid photos={residentPhotos} />
        </div>
      </div>
    </div>
  );
}
