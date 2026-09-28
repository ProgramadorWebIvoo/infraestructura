import { CLOSURE_PHOTO_MAX_BYTES, CLOSURE_PHOTO_MIMES, type ClosureReport } from "@/components/ClosureReport/types";
import type { ResidentProject } from "@/hooks/useResidentProjects";

/** Obras pendientes de su informe primero; el resto conserva el orden del backend. */
export function sortPendingFirst(projects: ResidentProject[]): ResidentProject[] {
  return [...projects].sort((a, b) => Number(b.pendingAction) - Number(a.pendingAction));
}

/** Mensaje de error de una foto de verificación, o null si es válida. */
export function validateResidentPhoto(file: Pick<File, "name" | "type" | "size">): string | null {
  if (!CLOSURE_PHOTO_MIMES.includes(file.type)) return `«${file.name}»: solo se permiten imágenes JPG, PNG o WEBP.`;
  if (file.size > CLOSURE_PHOTO_MAX_BYTES) return `«${file.name}»: la imagen debe pesar máximo 5 MB.`;
  return null;
}

export function hasResidentPhoto(project: ResidentProject): boolean {
  return project.closure?.photos.some((p) => p.uploadedByType === "RESIDENTE") ?? false;
}

/** Adapta el informe sanitizado del residente al tipo que consumen los componentes del cierre. */
export function toClosureReport(project: ResidentProject): ClosureReport | null {
  const closure = project.closure;
  if (!closure) return null;
  return {
    id: project.id,
    projectId: project.id,
    status: closure.status as ClosureReport["status"],
    revision: closure.revision,
    contractorNotes: null,
    submittedAt: closure.submittedAt,
    rejectionReason: closure.rejectionReason,
    rejectedByRole: null,
    items: closure.items,
    photos: closure.photos,
    residentNotes: closure.residentNotes,
    residentVerifiedAt: closure.residentVerifiedAt,
  };
}
