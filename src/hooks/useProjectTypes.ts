/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo de tipos de proyecto — GET /project-types. Reemplaza el union
 * type fijo "INFRAESTRUCTURA" | "MANTENIMIENTO"; administrable desde
 * ConfigAppPanel sin tocar código. Mismo patrón que useCatalog.ts.
 */

import { useCallback } from "react";
import { apiFetch } from "@/services/api";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export interface ProjectTypeOption {
  key: string;
  label: string;
}

export function useProjectTypes(authToken: string, showToast: ShowToast, enabled = true) {
  const { data: projectTypes, isLoading, refresh: loadProjectTypes } =
    usePolledFetch<ProjectTypeOption>({
      authToken: enabled ? authToken : "",
      showToast,
      queryKey: ["project-types"],
      fetcher: useCallback(() => apiFetch<ProjectTypeOption[]>("/project-types"), []),
      getSignature: useCallback(
        (data: ProjectTypeOption[]) => data.map(i => [i.key, i.label].join(":")).join("|"),
        [],
      ),
      errorMessage: "No se pudo cargar el catálogo de tipos de proyecto.",
    });

  return { projectTypes, isLoading, loadProjectTypes };
}
