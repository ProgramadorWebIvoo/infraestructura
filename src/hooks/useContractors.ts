/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook de contratistas. Estado + fetch GET /contractors + handlers.
 * Incluye polling para mantener el listado actualizado (nuevos registros
 * desde el portal público o cambios desde la configuración).
 */

import { useCallback } from "react";
import type { Contractor } from "../types";
import { apiFetch } from "../services/api";
import type { ShowToast } from "./useProjects";
import { usePolledFetch } from "./usePolledFetch";

export function useContractors(authToken: string, showToast: ShowToast) {
  const { data: contractors, setData: setContractors, isLoading, refresh: loadContractors } =
    usePolledFetch<Contractor>({
      authToken,
      showToast,
      fetcher: useCallback(() => apiFetch<Contractor[]>("/contractors", { token: authToken }), [authToken]),
      getSignature: useCallback(
        (data: Contractor[]) => data.map(c => [c.code, c.name, c.rating].join(":")).join("|"),
        [],
      ),
      errorMessage: "No se pudo cargar el catálogo de contratistas.",
      interval: 30000,
    });

  const handleAddContractor = useCallback((newContractor: Contractor) => {
    setContractors(prev => [...prev.filter(item => item.code !== newContractor.code), newContractor]);
  }, []);

  const handleUpdateContractorRating = useCallback(async (code: string, rating: number) => {
    await apiFetch(`/contractors/${code}/rating`, {
      method: "POST",
      token: authToken,
      body: JSON.stringify({ rating }),
    });
    setContractors(prev => prev.map(c => c.code === code ? { ...c, rating } : c));
  }, [authToken]);

  const resetContractors = useCallback(() => {
    setContractors([]);
  }, []);

  return {
    contractors,
    setContractors,
    isLoading,
    loadContractors,
    handleAddContractor,
    handleUpdateContractorRating,
    resetContractors,
  };
}
