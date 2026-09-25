/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Active registered locations for the work-request form — GET /localizations/active.
 */

import { useCallback } from "react";
import { apiFetch } from "@/services/api";
import type { Localization } from "@/types";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export function useActiveLocalizations(authToken: string, showToast: ShowToast, enabled = true) {
  const { data: localizations, isLoading } = usePolledFetch<Localization>({
    authToken: enabled ? authToken : "",
    showToast,
    queryKey: ["localizations", "active"],
    fetcher: useCallback(() => apiFetch<Localization[]>("/localizations/active"), []),
    getSignature: useCallback(
      (data: Localization[]) => data.map((l) => [l.id, l.title, l.city, l.type, l.residentUserId].join(":")).join("|"),
      [],
    ),
    errorMessage: "No se pudo cargar el catálogo de ubicaciones.",
  });

  return { localizations, isLoading };
}
