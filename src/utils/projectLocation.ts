import type { Project } from "@/types";

/** A work request carries exactly one of: a registered location or a free-text one (F2-R D10). */
export type ProjectLocationInput = { localizationId: number } | { location: string };

export type LocationMode = "registered" | "custom";

/** Draft fields shared by create and resubmit, without the location (see ProjectLocationInput). */
export type ProjectDraftBase = Omit<Project, "id" | "createdDate" | "status" | "location" | "localizationId" | "localizationTitle" | "residentUserId" | "residentName">;

export type NewProjectPayload = ProjectDraftBase & ProjectLocationInput;
export type ResubmitProjectPayload = Omit<ProjectDraftBase, "type"> & ProjectLocationInput;

/** Builds the XOR location payload: the unused side is omitted, never sent empty. */
export function buildLocationInput(mode: LocationMode, localizationId: number | null, location: string): ProjectLocationInput {
  return mode === "registered" && localizationId !== null ? { localizationId } : { location };
}

/** Auditoría must choose the resident only when the work has a custom (unregistered) location. */
export function reviewNeedsResidentChoice(project: Pick<Project, "localizationId">): boolean {
  return !project.localizationId;
}

/** Only custom-location works carry a resident chosen by Auditoría (D14); registered ones inherit it. */
export function reviewResidentPayload(project: Pick<Project, "localizationId">, residentUserId: number | null): number | undefined {
  return reviewNeedsResidentChoice(project) && residentUserId !== null ? residentUserId : undefined;
}

/** Statuses up to INFORME_ENVIADO in which Auditoría may still change a custom work's resident (S3). */
const RESIDENT_CHANGE_STATUSES = new Set<string>([
  "REVISADO_AUDITORIA",
  "EN_REEVALUACION_AUDITORIA",
  "CONFIRMADO_PROCURA",
  "COMPARATIVA_ENVIADA",
  "PENDIENTE_PRESIDENCIA",
  "APROBADO_PRESIDENCIA",
  "CONTRATADO",
  "EN_EJECUCION",
  "INFORME_ENVIADO",
]);

export function canChangeProjectResident(project: Pick<Project, "localizationId" | "status">): boolean {
  return !project.localizationId && RESIDENT_CHANGE_STATUSES.has(project.status);
}
