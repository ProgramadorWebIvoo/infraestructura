import { Trash2 } from "lucide-react";
import { getApiBaseUrl } from "@/services/api";
import type { ClosureReportPhoto } from "./types";

interface ClosurePhotoGridProps {
  photos: ClosureReportPhoto[];
  /** Si se define, muestra el botón de borrar en las fotos que devuelva true. */
  canDelete?: (photo: ClosureReportPhoto) => boolean;
  onDelete?: (photo: ClosureReportPhoto) => void;
}

const AUTHOR_LABEL: Record<ClosureReportPhoto["uploadedByType"], string> = {
  CONTRATISTA: "Contratista",
  RESIDENTE: "Residente",
};

export default function ClosurePhotoGrid({ photos, canDelete, onDelete }: ClosurePhotoGridProps) {
  if (photos.length === 0) {
    return <p className="text-xs text-text-secondary">Sin fotos adjuntas.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((photo) => {
        const src = `${getApiBaseUrl()}/${photo.path}`;
        return (
          <figure key={photo.id} className="relative overflow-hidden rounded-lg border border-border-default bg-surface-raised">
            <a href={src} target="_blank" rel="noreferrer">
              <img src={src} alt={photo.originalName} loading="lazy" className="h-28 w-full object-cover" />
            </a>
            <figcaption className="truncate px-2 py-1 text-[10px] font-semibold text-text-secondary">
              {AUTHOR_LABEL[photo.uploadedByType]} · {photo.originalName}
            </figcaption>
            {canDelete?.(photo) && onDelete && (
              <button
                type="button"
                aria-label={`Eliminar ${photo.originalName}`}
                onClick={() => onDelete(photo)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </figure>
        );
      })}
    </div>
  );
}
