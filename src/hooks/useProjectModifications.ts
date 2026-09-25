import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";

export type ModificationType = "AUMENTO" | "DISMINUCION";
export type ModificationStatus = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export interface ModificationItem {
  id: number;
  materialId: string;
  name: string | null;
  unit: string | null;
  type: ModificationType;
  quantity: number | string;
  unitPriceUsd: number | string | null;
  note: string | null;
}

export interface ModificationRequest {
  id: number;
  projectId: string;
  status: ModificationStatus;
  reason: string;
  rejectionReason: string | null;
  reviewNotes: string | null;
  requestedByName: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  netAmountUsd: number | string | null;
  items: ModificationItem[];
}

export interface EffectiveQuantity {
  contracted: number;
  modification: number;
  final: number;
}

export interface ModificationsResponse {
  requests: ModificationRequest[];
  effectiveQuantities: Record<string, EffectiveQuantity>;
  hasPending: boolean;
  canRequest: boolean;
  canReview: boolean;
}

export interface ModificationPayload {
  reason: string;
  items: { materialId: string; type: ModificationType; quantity: number; note?: string }[];
}

/** Solicitudes de modificación (F3) de una obra: carga, crea y edita/reenvía. */
export function useProjectModifications(projectId: string, authToken: string) {
  const [state, setState] = useState<ModificationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setState(await apiFetch<ModificationsResponse>(`/projects/${projectId}/modifications`, { token: authToken }));
    } catch (error) {
      logError("useProjectModifications", error);
      setState(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, authToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Crea (sin `modificationId`) o edita y reenvía (con él) una solicitud. */
  const save = useCallback(
    async (payload: ModificationPayload, modificationId?: number) => {
      await apiFetch(`/projects/${projectId}/modifications${modificationId ? `/${modificationId}` : ""}`, {
        method: modificationId ? "PUT" : "POST",
        token: authToken,
        body: JSON.stringify(payload),
      });
      await reload();
    },
    [projectId, authToken, reload],
  );

  return { state, isLoading, reload, save };
}
