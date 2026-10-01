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

/**
 * Estados en los que Auditoría todavía puede tocar el expediente de cierre
 * de una obra personalizada: cambiar el residente o reenviar el enlace del
 * informe al proveedor. El corte es VERIFICANDO_FINALIZACION — una vez
 * Auditoría aprueba el cierre (pasa a PENDIENTE_SOLICITUD_FINIQUITO), el
 * expediente queda certificado con ese residente y ese informe, y ninguna
 * de las dos acciones vuelve a estar disponible (backend lo valida igual en
 * ResidentAssignmentService::changeProjectResident).
 */
const CLOSURE_AUDIT_PENDING_STATUSES = new Set<string>([
  "REVISADO_AUDITORIA",
  "EN_REEVALUACION_AUDITORIA",
  "CONFIRMADO_PROCURA",
  "COMPARATIVA_ENVIADA",
  "PENDIENTE_PRESIDENCIA",
  "APROBADO_PRESIDENCIA",
  "CONTRATADO",
  "EN_EJECUCION",
  "INFORME_ENVIADO",
  "VERIFICANDO_FINALIZACION",
]);

export function canChangeProjectResident(project: Pick<Project, "localizationId" | "status">): boolean {
  return !project.localizationId && CLOSURE_AUDIT_PENDING_STATUSES.has(project.status);
}

/** El enlace del informe de cierre existe recién desde EN_EJECUCION (ver ProjectClosureService); se puede reenviar mientras el cierre no haya pasado la verificación de Auditoría. */
const CLOSURE_LINK_STATUSES = new Set<string>(["EN_EJECUCION", "INFORME_ENVIADO", "VERIFICANDO_FINALIZACION"]);

export function canResendClosureLink(project: Pick<Project, "status">): boolean {
  return CLOSURE_LINK_STATUSES.has(project.status);
}
