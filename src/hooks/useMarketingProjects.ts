/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Flujo de Marketing (marketing_projects) — creación y aprobación de piezas
 * publicitarias. Mismo patrón que useCurrencies.ts (fetch + CRUD directo,
 * sin draft/dirty) y que handleAddProject en useProjectsWorkflows.ts (crear
 * en dos fases: POST del JSON, luego subir adjuntos por separado vía
 * FormData) — reutiliza el mismo apiFetch, sin lógica nueva de transporte.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/services/api";
import { getErrorMessage, logError } from "@/services/logger";
import type { ShowToast } from "./useProjects";
import type { MarketingProject, MarketingProjectAttachment, MarketingProjectFormInput } from "@/views/MarketingPanel/types";

/** El backend pagina (Resource::collection->paginate(15)) — solo la primera página por ahora. */
interface PaginatedResponse<T> {
  data: T[];
}

export function useMarketingProjects(authToken: string, showToast: ShowToast, enabled = true) {
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Solo lo consume MarketingPanel (ROUTES.MARKETING) — mismo criterio que
  // useContractors/useCatalog: antes se pedía para los 10 roles en cada
  // mount de la app. (Va a quedar huérfano del todo cuando MarketingPanel se
  // reemplace por la vista "en construcción" — en ese momento, eliminar
  // el fetch en vez de solo gatearlo.)
  const load = useCallback(async () => {
    if (!authToken || !enabled) {
      // Sin esto, isLoading se queda en `true` para siempre en los roles sin
      // acceso a Marketing (el fetch real nunca corre para bajarlo a false).
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<MarketingProject>>("/marketing-projects", { token: authToken });
      setProjects(res.data);
    } catch (err) {
      logError("useMarketingProjects.load", err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const createProject = useCallback(
    async (data: MarketingProjectFormInput, files: File[]) => {
      setIsCreating(true);
      try {
        const created = await apiFetch<{ data: MarketingProject }>("/marketing-projects", {
          method: "POST",
          token: authToken,
          body: JSON.stringify(data),
        });

        if (files.length > 0) {
          const form = new FormData();
          files.forEach((f) => form.append("files[]", f));
          try {
            const saved = await apiFetch<MarketingProjectAttachment[]>(`/marketing-projects/${created.data.id}/attachments`, {
              method: "POST",
              token: authToken,
              body: form,
            });
            const optimizedCount = saved.filter(a => a.optimized).length;
            if (optimizedCount > 0) {
              showToast(`${optimizedCount} imagen(es) optimizada(s) automáticamente antes de guardarse.`, "info");
            }
          } catch (err) {
            logError("useMarketingProjects.create:uploadAttachments", err);
            showToast(
              getErrorMessage(err, "Propuesta creada, pero no se pudieron adjuntar los archivos."),
              "warning",
            );
          }
        }

        showToast("Propuesta creada correctamente.", "success");
        await load();
      } catch (err) {
        logError("useMarketingProjects.create", err);
        showToast("No se pudo crear la propuesta.", "error");
      } finally {
        setIsCreating(false);
      }
    },
    [authToken, showToast, load],
  );

  const submitForReview = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/marketing-projects/${id}/submit`, { method: "POST", token: authToken });
        await load();
      } catch (err) {
        logError("useMarketingProjects.submitForReview", err);
        showToast("No se pudo enviar la propuesta a revisión.", "error");
      }
    },
    [authToken, showToast, load],
  );

  const approve = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/marketing-projects/${id}/approve`, { method: "POST", token: authToken });
        showToast("Propuesta aprobada.", "success");
        await load();
      } catch (err) {
        logError("useMarketingProjects.approve", err);
        showToast("No se pudo aprobar la propuesta.", "error");
      }
    },
    [authToken, showToast, load],
  );

  const reject = useCallback(
    async (id: string, reason: string) => {
      try {
        await apiFetch(`/marketing-projects/${id}/reject`, {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ reason }),
        });
        showToast("Propuesta rechazada.", "success");
        await load();
      } catch (err) {
        logError("useMarketingProjects.reject", err);
        showToast("No se pudo rechazar la propuesta.", "error");
      }
    },
    [authToken, showToast, load],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/marketing-projects/${id}`, { method: "DELETE", token: authToken });
        showToast("Propuesta eliminada.", "success");
        await load();
      } catch (err) {
        logError("useMarketingProjects.deleteProject", err);
        showToast("No se pudo eliminar la propuesta.", "error");
      }
    },
    [authToken, showToast, load],
  );

  return {
    projects,
    isLoading,
    isCreating,
    createProject,
    submitForReview,
    approve,
    reject,
    deleteProject,
  };
}
