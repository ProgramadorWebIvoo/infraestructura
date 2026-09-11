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
import { logError } from "@/services/logger";
import type { ShowToast } from "./useProjects";
import type { MarketingProject, MarketingProjectFormInput } from "@/views/MarketingPanel/types";

/** El backend pagina (Resource::collection->paginate(15)) — solo la primera página por ahora. */
interface PaginatedResponse<T> {
  data: T[];
}

export function useMarketingProjects(authToken: string, showToast: ShowToast) {
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<MarketingProject>>("/marketing-projects", { token: authToken });
      setProjects(res.data);
    } catch (err) {
      logError("useMarketingProjects.load", err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

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
            await apiFetch(`/marketing-projects/${created.data.id}/attachments`, {
              method: "POST",
              token: authToken,
              body: form,
            });
          } catch (err) {
            logError("useMarketingProjects.create:uploadAttachments", err);
            showToast("Propuesta creada, pero no se pudieron adjuntar los archivos.", "warning");
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
