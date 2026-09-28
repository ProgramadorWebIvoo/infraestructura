/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Datos del módulo del residente ("Mis obras"): endpoints `/resident/projects*`
 * sanitizados por el backend (sin precios ni finiquito). Sin actualización
 * optimista: cada acción devuelve la obra ya actualizada.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ClosureReportItem, ClosureReportPhoto } from "@/components/ClosureReport/types";
import type { ResidentMeasurement } from "@/components/ClosureReport/closureMeasurements";

type ResidentItemDto = Omit<ClosureReportItem, "unitPriceUsd" | "finalQuantity" | "executedQuantity" | "note">;

interface ResidentClosureDto {
  status: string;
  revision: number;
  submittedAt: string | null;
  rejectionReason: string | null;
  rejectionTarget: "CONTRATISTA" | "RESIDENTE" | null;
  residentNotes: string | null;
  residentVerifiedAt: string | null;
  items: ResidentItemDto[];
  photos: ClosureReportPhoto[];
}

interface ResidentProjectDto {
  id: string;
  title: string;
  location: string;
  description: string | null;
  status: string;
  pendingAction: boolean;
  closure: ResidentClosureDto | null;
}

export interface ResidentProject extends Omit<ResidentProjectDto, "closure"> {
  closure: (Omit<ResidentClosureDto, "items"> & { items: ClosureReportItem[] }) | null;
}

export interface ResidentDocument {
  id: number;
  documentType: string;
  originalName: string;
  mimeType: string | null;
}

/** Los ítems del residente no traen precios ni lo declarado por el contratista (informe independiente); se rellenan para reutilizar los componentes del cierre. */
export function toResidentProject(dto: ResidentProjectDto): ResidentProject {
  return {
    ...dto,
    closure: dto.closure ? { ...dto.closure, items: dto.closure.items.map((item) => ({ ...item, unitPriceUsd: null, executedQuantity: 0, note: null })) } : null,
  };
}

export function useResidentProjects(authToken: string) {
  const [projects, setProjects] = useState<ResidentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const replace = useCallback((dto: ResidentProjectDto) => {
    const next = toResidentProject(dto);
    setProjects((current) => (current.some((p) => p.id === next.id) ? current.map((p) => (p.id === next.id ? next : p)) : [next, ...current]));
    return next;
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setProjects((await apiFetch<ResidentProjectDto[]>("/resident/projects", { token: authToken })).map(toResidentProject));
    } catch (error) {
      logError("useResidentProjects", error);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const send = useCallback(
    async (projectId: string, action: "approval", body: Record<string, unknown>, label: string) => {
      try {
        return replace(await apiFetch<ResidentProjectDto>(`/resident/projects/${projectId}/${action}`, { method: "POST", token: authToken, body: JSON.stringify(body) }));
      } catch (error) {
        logError(label, error);
        throw error;
      }
    },
    [authToken, replace],
  );

  const approve = useCallback((projectId: string, notes: string | undefined, items: ResidentMeasurement[]) => send(projectId, "approval", { notes, items }, "resident.approve"), [send]);

  const uploadPhoto = useCallback(
    async (projectId: string, file: File, itemId?: number) => {
      const form = new FormData();
      form.append("image", file);
      if (itemId) form.append("itemId", String(itemId));
      try {
        await apiFetch(`/resident/projects/${projectId}/photos`, { method: "POST", token: authToken, body: form });
        replace(await apiFetch<ResidentProjectDto>(`/resident/projects/${projectId}`, { token: authToken }));
      } catch (error) {
        logError("resident.uploadPhoto", error);
        throw error;
      }
    },
    [authToken, replace],
  );

  const deletePhoto = useCallback(
    async (projectId: string, photoId: number) => {
      try {
        await apiFetch(`/resident/projects/${projectId}/photos/${photoId}`, { method: "DELETE", token: authToken });
        replace(await apiFetch<ResidentProjectDto>(`/resident/projects/${projectId}`, { token: authToken }));
      } catch (error) {
        logError("resident.deletePhoto", error);
        throw error;
      }
    },
    [authToken, replace],
  );

  const loadDocuments = useCallback((projectId: string) => apiFetch<ResidentDocument[]>(`/resident/projects/${projectId}/documents`, { token: authToken }), [authToken]);

  return { projects, isLoading, reload, approve, uploadPhoto, deletePhoto, loadDocuments };
}
