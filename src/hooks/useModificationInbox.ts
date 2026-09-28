import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ModificationRequest, ModificationStatus } from "./useProjectModifications";

/** Solicitud de la bandeja transversal: incluye el título de la obra. */
export type InboxModification = ModificationRequest & { projectTitle: string | null };

/** Bandeja de solicitudes de modificación (F3) de las obras visibles, filtrada por estado. */
export function useModificationInbox(status: ModificationStatus | "TODAS", authToken: string) {
  const [requests, setRequests] = useState<InboxModification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = status === "TODAS" ? "" : `?status=${status}`;
      setRequests(await apiFetch<InboxModification[]>(`/modification-requests${query}`, { token: authToken }));
    } catch (error) {
      logError("useModificationInbox", error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, authToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { requests, isLoading, reload };
}
