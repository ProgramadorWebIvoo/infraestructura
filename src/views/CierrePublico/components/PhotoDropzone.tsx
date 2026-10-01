import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { getApiBaseUrl } from "@/services/api";
import { CLOSURE_PHOTO_MIMES, type ClosureReportPhoto } from "@/components/ClosureReport/types";

interface PhotoDropzoneProps {
  photos: ClosureReportPhoto[];
  editable: boolean;
  /** Permite borrar fotos (por defecto sí cuando es editable). */
  canDelete?: boolean;
  isUploading: boolean;
  onFiles: (files: File[]) => void;
  onDelete: (photo: ClosureReportPhoto) => void;
  /** "dark" (portal público del proveedor) o "light" (módulos internos). */
  theme?: "dark" | "light";
  /** Si se define, la miniatura abre el previsualizador en lugar de una pestaña nueva. */
  onPreview?: (photo: ClosureReportPhoto) => void;
}

const THEMES = {
  dark: {
    zone: "border-white/15 bg-white/[0.03] hover:border-emerald-400/50 hover:bg-white/[0.05]",
    zoneActive: "border-emerald-400 bg-emerald-400/10",
    icon: "bg-emerald-400/10 text-emerald-300",
    title: "text-slate-200",
    hint: "text-slate-500",
    card: "border-white/10 bg-white/5",
    caption: "text-slate-400",
    pending: "border-emerald-400/20 bg-emerald-400/5",
    spinner: "text-emerald-300",
  },
  light: {
    zone: "border-border-default bg-surface hover:border-emerald-400 hover:bg-emerald-50/40",
    zoneActive: "border-emerald-500 bg-emerald-50",
    icon: "bg-emerald-50 text-emerald-600",
    title: "text-text-primary",
    hint: "text-text-secondary",
    card: "border-border-default bg-surface-raised",
    caption: "text-text-secondary",
    pending: "border-emerald-200 bg-emerald-50",
    spinner: "text-emerald-600",
  },
} as const;

/** Zona de arrastre + miniaturas de las fotos de evidencia (JPG/PNG/WEBP, máx. 5 MB c/u). */
export default function PhotoDropzone({ photos, editable, canDelete = true, isUploading, onFiles, onDelete, theme = "dark", onPreview }: PhotoDropzoneProps) {
  const t = THEMES[theme];
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) onFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!editable || isUploading) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div className="space-y-3">
      {editable && (
        <>
          <input ref={inputRef} id="closure-photo-input" type="file" multiple accept={CLOSURE_PHOTO_MIMES.join(",")} className="sr-only" onChange={handleChange} />
          <div
            role="button"
            tabIndex={0}
            aria-label="Agregar fotos de evidencia"
            onClick={() => !isUploading && inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !isUploading && (e.preventDefault(), inputRef.current?.click())}
            onDragOver={(e) => (e.preventDefault(), setIsDragging(true))}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
              isDragging ? t.zoneActive : t.zone
            }`}
          >
            <motion.span
              animate={reduceMotion ? undefined : { y: isDragging ? -4 : 0, scale: isDragging ? 1.1 : 1 }}
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${t.icon}`}
            >
              {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            </motion.span>
            <p className={`text-sm font-bold ${t.title}`}>{isUploading ? "Subiendo fotos…" : "Arrastre las fotos aquí o toque para elegirlas"}</p>
            <p className={`flex items-center gap-1 text-[11px] ${t.hint}`}>
              <ImagePlus className="h-3 w-3" /> JPG, PNG o WEBP · máx. 5 MB por foto · mínimo 1
            </p>
          </div>
        </>
      )}

      {photos.length === 0 && !editable && <p className={`text-xs ${t.hint}`}>Sin fotos adjuntas.</p>}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {photos.map((photo) => {
            const src = `${getApiBaseUrl()}/${photo.path}`;
            return (
              <motion.li
                key={photo.id}
                layout
                initial={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
                className={`group relative overflow-hidden rounded-xl border ${t.card}`}
              >
                {onPreview ? (
                  <button type="button" onClick={() => onPreview(photo)} aria-label={`Ver ${photo.originalName}`} className="block w-full cursor-pointer">
                    <img src={src} alt={photo.originalName} loading="lazy" className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </button>
                ) : (
                  <a href={src} target="_blank" rel="noreferrer" aria-label={`Ver ${photo.originalName}`}>
                    <img src={src} alt={photo.originalName} loading="lazy" className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </a>
                )}
                <p className={`truncate px-2 py-1 text-[10px] font-semibold ${t.caption}`}>{photo.originalName}</p>
                {editable && canDelete && (
                  <button
                    type="button"
                    aria-label={`Eliminar ${photo.originalName}`}
                    onClick={() => onDelete(photo)}
                    className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-slate-950/70 p-1.5 text-white opacity-100 backdrop-blur transition hover:bg-rose-600 focus-visible:ring-2 focus-visible:ring-rose-400 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.li>
            );
          })}
          {isUploading && (
            <li key="uploading" aria-hidden="true" className={`flex h-[8.25rem] animate-pulse items-center justify-center rounded-xl border ${t.pending}`}>
              <Loader2 className={`h-5 w-5 animate-spin ${t.spinner}`} />
            </li>
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
