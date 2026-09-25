import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { logError } from "@/services/logger";
import type { ClosureReport } from "@/components/ClosureReport/types";

/** Carga el informe de cierre de una obra (autenticado). `null` si la obra aún no tiene informe. */
export function useClosureReport(projectId: string | null, authToken: string) {
  const [report, setReport] = useState<ClosureReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      setReport(await apiFetch<ClosureReport>(`/projects/${projectId}/closure-report`, { token: authToken }));
    } catch (error) {
      logError("useClosureReport", error);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, authToken]);

  useEffect(() => {
    setReport(null);
    void reload();
  }, [reload]);

  return { report, isLoading, reload };
}
