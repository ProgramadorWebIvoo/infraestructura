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
