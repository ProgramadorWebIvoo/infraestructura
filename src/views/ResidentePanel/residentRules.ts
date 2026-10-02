import type { ClosureReport } from "@/components/ClosureReport/types";
import type { ResidentProject } from "@/hooks/useResidentProjects";

/** Obras pendientes de su informe primero; el resto conserva el orden del backend. */
export function sortPendingFirst(projects: ResidentProject[]): ResidentProject[] {
  return [...projects].sort((a, b) => Number(b.pendingAction) - Number(a.pendingAction));
}

export type ResidentReportState = "PENDIENTE" | "DEVUELTO" | "ENVIADO";
export type ResidentReportFilter = ResidentReportState | "ALL";

/** Estado del informe propio del residente: por cargar, devuelto por Auditoría o ya enviado. */
export function reportState(project: ResidentProject): ResidentReportState {
  if (!project.pendingAction) return "ENVIADO";
  return project.closure?.rejectionTarget === "RESIDENTE" ? "DEVUELTO" : "PENDIENTE";
}

/** Filtra por texto (título, ID o ubicación) y por estado del informe; conserva el orden recibido. */
export function filterResidentProjects(projects: ResidentProject[], query: string, filter: ResidentReportFilter): ResidentProject[] {
  const q = query.trim().toLowerCase();
  return projects.filter(
    (p) =>
      (filter === "ALL" || reportState(p) === filter) &&
      (!q || p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)),
  );
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
